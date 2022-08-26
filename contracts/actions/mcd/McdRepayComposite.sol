// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";
import "../fee/GasFeeTaker.sol";

import "../../interfaces/balancer/IFlashLoanRecipient.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IDaiJoin.sol";

import "../../utils/ReentrancyGuard.sol";
import "../../utils/TokenUtils.sol";
import "../../core/strategy/StrategyModel.sol";

import "./helpers/McdHelper.sol";
import "../balancer/helpers/MainnetBalancerV2Addresses.sol";

contract McdRepayComposite is
ActionBase, DFSSell, GasFeeTaker, McdHelper {
    using TokenUtils for address;

    /// @param vaultId Id of the vault
    /// @param joinAddr Collateral join address
    /// @param gasUsed Gas amount to charge in strategies
    /// @param exchangeData Data needed for swap
    struct RepayParams {
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

        repayParams.exchangeData.srcAddr = _parseParamAddr(
            repayParams.exchangeData.srcAddr,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        repayParams.exchangeData.destAddr = _parseParamAddr(
            repayParams.exchangeData.destAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );

        repayParams.exchangeData.srcAmount = _parseParamUint(
            repayParams.exchangeData.srcAmount,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        bytes memory logData = _repay(repayParams);
        emit ActionEvent(
            "McdRepayComposite",
            logData
        );
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override (ActionBase, DFSSell, GasFeeTaker) {
        RepayParams memory repayParams = _parseCompositeParams(_callData);
        bytes memory logData = _repay(repayParams);
        logger.logActionDirectEvent(
            "McdRepayComposite",
            logData
        );
    }

    /// @notice Executes repay logic
    function _repay(RepayParams memory _repayParams) internal returns (bytes memory logData) {
        assert(_repayParams.exchangeData.destAddr == DAI_ADDR);
        uint256 collateral = getAllColl(IManager(MCD_MANAGER_ADDR), _repayParams.joinAddr, _repayParams.vaultId);
        uint256 repayAmount = _repayParams.exchangeData.srcAmount > collateral ? collateral : _repayParams.exchangeData.srcAmount;
        _repayParams.exchangeData.srcAmount = repayAmount;

        // Withdraw collateral
        {
            uint256 frobAmount = convertTo18(_repayParams.joinAddr, repayAmount);
            IManager(MCD_MANAGER_ADDR).frob(
                _repayParams.vaultId,
                -toPositiveInt(frobAmount),
                0
            );
            IManager(MCD_MANAGER_ADDR).flux(_repayParams.vaultId, address(this), frobAmount);
            IJoin(_repayParams.joinAddr).exit(address(this), repayAmount);
        }

        // Sell collateral asset for debt asset
        (uint256 exchangedAmount, ) = _dfsSell(_repayParams.exchangeData, address(this), address(this), false);

        // Take gas fee
        uint256 paybackAmount = _takeFee(GasFeeTakerParams(
            _repayParams.gasUsed,
            DAI_ADDR,
            exchangedAmount,
            0
        ));

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
            int256 paybackAmountNormalized = normalizePaybackAmount(address(vat), daiVatBalance, urn, ilk);

            IManager(MCD_MANAGER_ADDR).frob(
                _repayParams.vaultId,
                0,
                paybackAmountNormalized
            );
        }

        logData = abi.encode(
            address(this),
            repayAmount,
            exchangedAmount,
            paybackAmount
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

    function _parseCompositeParams(bytes memory _calldata) internal pure returns (RepayParams memory params) {
        params = abi.decode(_calldata, (RepayParams));
    }
}