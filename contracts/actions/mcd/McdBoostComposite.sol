// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";
import "../fee/GasFeeTaker.sol";

import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";

import "./helpers/McdHelper.sol";
import "./helpers/McdRatioHelper.sol";

/// @title Single mcd boost action can use flashloan or not
contract McdBoostComposite is ActionBase, DFSSell, GasFeeTaker, McdHelper, McdRatioHelper {
    using TokenUtils for address;

    error RatioNotLowerThanBefore(uint256, uint256);
    error WrongAsset(address);
    error TargetRatioMiss(uint256, uint256);

    /// @dev 2% offset acceptable
    uint256 internal constant RATIO_OFFSET = 20000000000000000;

    /// @param vaultId Id of the vault
    /// @param joinAddr Collateral join address
    /// @param gasUsed Gas amount to charge in strategies
    /// @param flAddr Flashloan address 0x0 if we're not using flashloan
    /// @param flAmount Amount that the flashloan actions returns if used (must have it because of fee)
    /// @param nextPrice Maker OSM next price if 0 we're using current price (used for ratio check)
    /// @param targetRatio Target ratio to repay if 0 we are not checking the ratio
    /// @param exchangeData Data needed for swap
    struct BoostParams {
        uint256 vaultId;
        address joinAddr;
        uint256 gasUsed;
        address flAddr;
        uint256 flAmount;
        uint256 nextPrice;
        uint256 targetRatio;
        ExchangeData exchangeData;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override(ActionBase, DFSSell, GasFeeTaker) returns (bytes32) {
        BoostParams memory boostParams = _parseCompositeParams(_callData);

        boostParams.vaultId = _parseParamUint(
            boostParams.vaultId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        boostParams.joinAddr = _parseParamAddr(
            boostParams.joinAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        boostParams.flAmount = _parseParamUint(
            boostParams.flAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAddr = _parseParamAddr(
            boostParams.exchangeData.srcAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );
        boostParams.exchangeData.destAddr = _parseParamAddr(
            boostParams.exchangeData.destAddr,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAmount = _parseParamUint(
            boostParams.exchangeData.srcAmount,
            _paramMapping[5],
            _subData,
            _returnValues
        );

        (bytes memory logData, uint256 suppliedAmount) = _boost(boostParams);
        emit ActionEvent("McdBoostComposite", logData);

        return bytes32(suppliedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData)
        public
        payable
        virtual
        override(ActionBase, DFSSell, GasFeeTaker)
    {
        BoostParams memory boostParams = _parseCompositeParams(_callData);
        (bytes memory logData, ) = _boost(boostParams);
        logger.logActionDirectEvent("McdBoostComposite", logData);
    }

    /// @notice Executes boost logic
    function _boost(BoostParams memory _boostParams)
        internal
        returns (bytes memory logData, uint256 supplyAmount)
    {
        if (_boostParams.exchangeData.srcAddr != DAI_ADDR) {
            revert WrongAsset(_boostParams.exchangeData.srcAddr);
        }

        (address urn, bytes32 ilk) = getUrnAndIlk(MCD_MANAGER_ADDR, _boostParams.vaultId);

        uint256 ratioBefore;
        if (_boostParams.gasUsed != 0) {
             ratioBefore = getRatio(_boostParams.vaultId, _boostParams.nextPrice);
        }

        address collateralAsset = _boostParams.exchangeData.destAddr;
        uint256 boostAmount = _boostParams.exchangeData.srcAmount;

        if (_boostParams.flAddr == address(0)) {
            _drawDebt(boostAmount, _boostParams.vaultId, urn, ilk);
        }

        // Sell debt asset for collateral asset
        (uint256 exchangedAmount, ) = _dfsSell(
            _boostParams.exchangeData,
            address(this),
            address(this),
            false
        );

        // Take gas fee if part of strategy
        if (_boostParams.gasUsed != 0) {
            supplyAmount = _takeFee(
                GasFeeTakerParams(
                    _boostParams.gasUsed,
                    collateralAsset,
                    exchangedAmount,
                    MAX_DFS_FEE
                )
            );
        } else {
            supplyAmount = exchangedAmount;
        }

        // Supply collateral
        {
            int256 vatSupplyAmount = toPositiveInt(
                convertTo18(_boostParams.joinAddr, supplyAmount)
            );
            collateralAsset.approveToken(_boostParams.joinAddr, supplyAmount);
            IJoin(_boostParams.joinAddr).join(urn, supplyAmount);

            IManager(MCD_MANAGER_ADDR).frob(_boostParams.vaultId, vatSupplyAmount, 0);
        }

        // if we're using flashloan draw debt and repay fl
        if (_boostParams.flAddr != address(0)) {
            uint256 daiAmount = _drawDebt(_boostParams.flAmount, _boostParams.vaultId, urn, ilk);
            DAI_ADDR.withdrawTokens(_boostParams.flAddr, daiAmount);
        }

        // check if collateral is higher, only if part of strategy
        if (_boostParams.gasUsed != 0) {
            uint256 ratioAfter = getRatio(_boostParams.vaultId, _boostParams.nextPrice);

            // ratio worst off than before
            if (ratioAfter >= ratioBefore) {
                revert RatioNotLowerThanBefore(ratioBefore, ratioAfter);
            }

            // check if ratio is in the target range
            if (_boostParams.targetRatio != 0 && ratioAfter < (_boostParams.targetRatio - RATIO_OFFSET)) {
                revert TargetRatioMiss(ratioAfter, _boostParams.targetRatio);
            }
        }

        logData = abi.encode(boostAmount, exchangedAmount, supplyAmount, _boostParams.flAddr);
    }

    function _drawDebt(
        uint256 _drawAmount,
        uint256 _vaultId,
        address _urn,
        bytes32 _ilk
    ) internal returns (uint256) {
        uint256 daiVatBalance = vat.dai(_urn);
        uint256 rate = IJug(JUG_ADDRESS).drip(_ilk);
        int256 drawAmountNormalized = normalizeDrawAmount(_drawAmount, rate, daiVatBalance);

        IManager(MCD_MANAGER_ADDR).frob(_vaultId, 0, drawAmountNormalized);
        IManager(MCD_MANAGER_ADDR).move(_vaultId, address(this), toRad(_drawAmount));
        vat.hope(DAI_JOIN_ADDR);
        IDaiJoin(DAI_JOIN_ADDR).exit(address(this), _drawAmount);
        vat.nope(DAI_JOIN_ADDR);

        return _drawAmount;
    }

    /// @inheritdoc ActionBase
    function actionType()
        public
        pure
        virtual
        override(ActionBase, DFSSell, GasFeeTaker)
        returns (uint8)
    {
        return uint8(ActionType.CUSTOM_ACTION);
    }

    function _parseCompositeParams(bytes memory _calldata)
        internal
        pure
        returns (BoostParams memory params)
    {
        params = abi.decode(_calldata, (BoostParams));
    }
}
