// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";
import "../fee/GasFeeTaker.sol";

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";

import "../../utils/TokenUtils.sol";
import "../../core/strategy/StrategyModel.sol";

import "./helpers/McdHelper.sol";

contract McdBoostComposite is
ActionBase, DFSSell, GasFeeTaker, McdHelper {
    using TokenUtils for address;

    error RatioNotHigherThanBefore(uint256, uint256);

    /// @param vaultId Id of the vault
    /// @param joinAddr Collateral join address
    /// @param gasUsed Gas amount to charge in strategies
    /// @param exchangeData Data needed for swap
    struct BoostParams {
        uint256 vaultId;
        address joinAddr;
        uint256 gasUsed;
        ExchangeData exchangeData;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override (ActionBase, DFSSell, GasFeeTaker) returns (bytes32) {
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

        boostParams.exchangeData.srcAddr = _parseParamAddr(
            boostParams.exchangeData.srcAddr,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        boostParams.exchangeData.destAddr = _parseParamAddr(
            boostParams.exchangeData.destAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAmount = _parseParamUint(
            boostParams.exchangeData.srcAmount,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        bytes memory logData = _boost(boostParams);
        emit ActionEvent(
            "McdBoostComposite",
            logData
        );
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override (ActionBase, DFSSell, GasFeeTaker) {
        BoostParams memory boostParams = _parseCompositeParams(_callData);
        bytes memory logData = _boost(boostParams);
        logger.logActionDirectEvent(
            "McdBoostComposite",
            logData
        );
    }

    /// @notice Executes boost logic
    function _boost(BoostParams memory _boostParams) internal returns (bytes memory logData) {
        assert(_boostParams.exchangeData.srcAddr == DAI_ADDR);
        (address urn, bytes32 ilk) = getUrnAndIlk(MCD_MANAGER_ADDR, _boostParams.vaultId);
    
        address collateralAsset = _boostParams.exchangeData.destAddr;
        uint256 boostAmount = _boostParams.exchangeData.srcAmount;

        // Draw debt
        {
            uint256 daiVatBalance = vat.dai(urn);
            uint256 rate = IJug(JUG_ADDRESS).drip(ilk);
            int256 drawAmountNormalized = normalizeDrawAmount(boostAmount, rate, daiVatBalance);

            IManager(MCD_MANAGER_ADDR).frob(
                _boostParams.vaultId,
                0,
                drawAmountNormalized
            );
            IManager(MCD_MANAGER_ADDR).move(_boostParams.vaultId, address(this), toRad(boostAmount));
            vat.hope(DAI_JOIN_ADDR);
            IDaiJoin(DAI_JOIN_ADDR).exit(address(this), boostAmount);
            vat.nope(DAI_JOIN_ADDR);
        }

        // Sell debt asset for collateral asset
        (uint256 exchangedAmount, ) = _dfsSell(_boostParams.exchangeData, address(this), address(this), false);

        // Take gas fee if part of strategy
        uint256 supplyAmount;
        if (_boostParams.gasUsed != 0) {
            supplyAmount = _takeFee(GasFeeTakerParams(
                _boostParams.gasUsed,
                collateralAsset,
                exchangedAmount,
                MAX_DFS_FEE
            ));

            // check if boost lowers CR
            (uint256 collateral, uint256 debt) = getCdpInfo(
                IManager(MCD_MANAGER_ADDR),
                _boostParams.vaultId,
                ilk
            );

            uint256 rawRatioBefore = rdiv(collateral, debt);
            uint256 rawRatioAfter = rdiv(collateral + supplyAmount, debt + boostAmount);
            if (rawRatioAfter > rawRatioBefore) revert RatioNotHigherThanBefore(rawRatioBefore, rawRatioAfter);
        } else {
            supplyAmount = exchangedAmount;
        }

        // Supply collateral
        {
            int256 vatSupplyAmount = toPositiveInt(convertTo18(_boostParams.joinAddr, supplyAmount));
            collateralAsset.approveToken(_boostParams.joinAddr, supplyAmount);
            IJoin(_boostParams.joinAddr).join(urn, supplyAmount);

            IManager(MCD_MANAGER_ADDR).frob(
                _boostParams.vaultId,
                vatSupplyAmount,
                0
            );
        }

        logData = abi.encode(
            boostAmount,
            exchangedAmount,
            supplyAmount
        );
    }

    /// @inheritdoc ActionBase
    function actionType()
    public
    pure
    virtual override (ActionBase, DFSSell, GasFeeTaker)
    returns (uint8) {
        return uint8(ActionType.CUSTOM_ACTION);
    }

    function _parseCompositeParams(bytes memory _calldata) internal pure returns (BoostParams memory params) {
        params = abi.decode(_calldata, (BoostParams));
    }
}