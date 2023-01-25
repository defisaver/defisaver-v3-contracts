// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../interfaces/mcd/IDaiJoin.sol";

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";
import "../fee/GasFeeTaker.sol";

import "./helpers/McdHelper.sol";
import "./helpers/McdRatioHelper.sol";

/// @title Single mcd repay action can use flashloan or not
contract McdRepayComposite is ActionBase, DFSSell, GasFeeTaker, McdHelper, McdRatioHelper {
    using TokenUtils for address;

    error RatioNotHigherThanBefore(uint256, uint256);
    error WrongAsset(address);
    error TargetRatioMiss(uint256, uint256);

    /// @dev 2% offset acceptable
    uint256 internal constant RATIO_OFFSET = 20000000000000000;

    /// @param vaultId Id of the vault
    /// @param joinAddr Collateral join address
    /// @param gasUsed Gas amount to charge in strategies
    /// @param flAddress Flashloan address 0x0 if we're not using flashloan
    /// @param flAmount Amount that the flashloan actions returns if used (must have it because of fee)
    /// @param nextPrice Maker OSM next price if 0 we're using current price (used for ratio check)
    /// @param targetRatio Target ratio to repay if 0 we are not checking the ratio
    /// @param exchangeData Data needed for swap
    struct RepayParams {
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
        RepayParams memory repayParams = _parseCompositeParams(_callData);

        repayParams.vaultId = _parseParamUint(
            repayParams.vaultId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        repayParams.joinAddr = _parseParamAddr(
            repayParams.joinAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        repayParams.flAmount = _parseParamUint(
            repayParams.flAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        repayParams.exchangeData.srcAddr = _parseParamAddr(
            repayParams.exchangeData.srcAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );
        repayParams.exchangeData.destAddr = _parseParamAddr(
            repayParams.exchangeData.destAddr,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        repayParams.exchangeData.srcAmount = _parseParamUint(
            repayParams.exchangeData.srcAmount,
            _paramMapping[5],
            _subData,
            _returnValues
        );

        (bytes memory logData, uint256 paybackAmount) = _repay(repayParams);
        emit ActionEvent("McdRepayComposite", logData);

        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData)
        public
        payable
        virtual
        override(ActionBase, DFSSell, GasFeeTaker)
    {
        RepayParams memory repayParams = _parseCompositeParams(_callData);
        (bytes memory logData, ) = _repay(repayParams);
        logger.logActionDirectEvent("McdRepayComposite", logData);
    }

    /// @notice Executes repay logic
    function _repay(RepayParams memory _repayParams) internal returns (bytes memory logData, uint256 paybackAmount) {
        if (_repayParams.exchangeData.destAddr != DAI_ADDR) {
            revert WrongAsset(_repayParams.exchangeData.destAddr);
        }
    
        uint256 ratioBefore;
        // is part of strategy so check before ratio
        if (_repayParams.gasUsed != 0) {
            ratioBefore = getRatio(_repayParams.vaultId, _repayParams.nextPrice);
        }

        uint256 repayAmount = _repayParams.exchangeData.srcAmount;

        // Withdraw collateral if not using flashloan
        if (_repayParams.flAddr == address(0)) {
            _withdrawColl(_repayParams, repayAmount);
        }

        // Sell collateral asset for debt asset
        (uint256 exchangedAmount, ) = _dfsSell(
            _repayParams.exchangeData,
            address(this),
            address(this),
            false
        );

        // Take gas fee if part of strategy
        if (_repayParams.gasUsed != 0) {
            paybackAmount = _takeFee(
                GasFeeTakerParams(_repayParams.gasUsed, DAI_ADDR, exchangedAmount, MAX_DFS_FEE)
            );
        } else {
            paybackAmount = exchangedAmount;
        }

        // Payback debt
        {
            // if paybackAmount is higher than current debt, repay all debt and send remaining dai to proxy owner
            (address urn, bytes32 ilk) = getUrnAndIlk(MCD_MANAGER_ADDR, _repayParams.vaultId);
            uint256 debt = getAllDebt(address(vat), urn, urn, ilk);
            if (paybackAmount > debt) {
                DAI_ADDR.withdrawTokens(IDSProxy(address(this)).owner(), paybackAmount - debt);
                paybackAmount = debt;
            }

            DAI_ADDR.approveToken(DAI_JOIN_ADDR, paybackAmount);
            IDaiJoin(DAI_JOIN_ADDR).join(urn, paybackAmount);
            uint256 daiVatBalance = vat.dai(urn);
            int256 paybackAmountNormalized = normalizePaybackAmount(
                address(vat),
                daiVatBalance,
                urn,
                ilk
            );

            IManager(MCD_MANAGER_ADDR).frob(_repayParams.vaultId, 0, paybackAmountNormalized);
        }

        // return fl amount if used
        if (_repayParams.flAddr != address(0)) {
            _withdrawColl(_repayParams, _repayParams.flAmount);
            _repayParams.exchangeData.srcAddr.withdrawTokens(_repayParams.flAddr, _repayParams.flAmount);
        }

        // is part of strategy so check after ratio
        if (_repayParams.gasUsed != 0) {    
            uint256 ratioAfter = getRatio(_repayParams.vaultId, _repayParams.nextPrice);

            // ratio worst off than before
            if (ratioAfter < ratioBefore) {
                revert RatioNotHigherThanBefore(ratioBefore, ratioAfter);
            }

            // can't repay too much over targetRatio so we don't trigger boost after
            if (_repayParams.targetRatio != 0 && ratioAfter > (_repayParams.targetRatio + RATIO_OFFSET)) {
                revert TargetRatioMiss(ratioAfter, _repayParams.targetRatio);
            }
        }

        logData = abi.encode(address(this), repayAmount, exchangedAmount, paybackAmount, _repayParams.flAddr);
    }

    function _withdrawColl(RepayParams memory _repayParams, uint256 _repayAmount) internal {
        uint256 frobAmount = convertTo18(_repayParams.joinAddr, _repayAmount);

        IManager(MCD_MANAGER_ADDR).frob(_repayParams.vaultId, -toPositiveInt(frobAmount), 0);
        IManager(MCD_MANAGER_ADDR).flux(_repayParams.vaultId, address(this), frobAmount);
        IJoin(_repayParams.joinAddr).exit(address(this), _repayAmount);
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
        returns (RepayParams memory params)
    {
        params = abi.decode(_calldata, (RepayParams));
    }
}
