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

contract McdFLRepayComposite is
ActionBase, DFSSell, GasFeeTaker, McdHelper, IFlashLoanRecipient,
ReentrancyGuard, MainnetBalancerV2Addresses {
    using TokenUtils for address;

    address internal immutable ACTION_ADDR = address(this);

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

        _flBalancer(repayParams);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override (ActionBase, DFSSell, GasFeeTaker) {
        RepayParams memory repayParams = _parseCompositeParams(_callData);
        _flBalancer(repayParams);
    }

    /// @notice Gets a FL from Balancer
    function _flBalancer(RepayParams memory _repayParams) internal {
        assert(_repayParams.exchangeData.destAddr == DAI_ADDR);

        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        tokens[0] = _repayParams.exchangeData.srcAddr;
        amounts[0] = _repayParams.exchangeData.srcAmount;

        IManager(MCD_MANAGER_ADDR).cdpAllow(_repayParams.vaultId, ACTION_ADDR, 1);
        IFlashLoans(VAULT_ADDR).flashLoan(
            ACTION_ADDR,
            tokens,
            amounts,
            abi.encode(_repayParams, address(this))
        );
        IManager(MCD_MANAGER_ADDR).cdpAllow(_repayParams.vaultId, ACTION_ADDR, 0);
    }

    /// @notice Balancer FL callback function that formats and calls back this action contract
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (RepayParams memory repayParams, address proxy) = abi.decode(_userData, (RepayParams, address));

        _repay(proxy, _feeAmounts[0], repayParams);

        uint256 flPaybackAmount = _amounts[0] + _feeAmounts[0];
        _tokens[0].withdrawTokens(address(VAULT_ADDR), flPaybackAmount);
    }

    /// @notice Executes flashloan repay logic
    function _repay(address _proxy, uint256 _flFeeAmount, RepayParams memory _repayParams) internal {
        uint256 collateral = getAllColl(IManager(MCD_MANAGER_ADDR), _repayParams.joinAddr, _repayParams.vaultId);
        uint256 swapAmountWithFLFee = _repayParams.exchangeData.srcAmount + _flFeeAmount;
        uint256 repayAmount;
        if (swapAmountWithFLFee > collateral) {
            repayAmount = collateral;
            _repayParams.exchangeData.srcAmount = collateral - _flFeeAmount;
        } else {
            repayAmount = swapAmountWithFLFee;
        }

        // Sell flashloaned collateral asset for debt asset
        (uint256 exchangedAmount, ) = _dfsSell(_repayParams.exchangeData, address(this), address(this), false);

        // Take gas fee
        uint256 paybackAmount = _takeFee(GasFeeTakerParams(
            _repayParams.gasUsed,
            DAI_ADDR,
            exchangedAmount,
            0
        ));

        // Withdraw collateral and payback debt
        {
            // if paybackAmount is higher than current debt, repay all debt and send remaining dai to proxy
            (address urn, bytes32 ilk) = getUrnAndIlk(MCD_MANAGER_ADDR, _repayParams.vaultId);
            uint256 debt = getAllDebt(address(vat), urn, urn, ilk);
            if (paybackAmount > debt) {
                DAI_ADDR.withdrawTokens(IDSProxy(_proxy).owner(), paybackAmount - debt);
                paybackAmount = debt;
            }

            DAI_ADDR.approveToken(DAI_JOIN_ADDR, paybackAmount);
            IDaiJoin(DAI_JOIN_ADDR).join(urn, paybackAmount);
            uint256 daiVatBalance = vat.dai(urn);
            int256 paybackAmountNormalized = normalizePaybackAmount(address(vat), daiVatBalance, urn, ilk);
            uint256 frobAmount = convertTo18(_repayParams.joinAddr, repayAmount);

            IManager(MCD_MANAGER_ADDR).frob(
                _repayParams.vaultId,
                -toPositiveInt(frobAmount),
                paybackAmountNormalized
            );
            IManager(MCD_MANAGER_ADDR).flux(_repayParams.vaultId, address(this), frobAmount);
            // withdraw the tokens from Join
            IJoin(_repayParams.joinAddr).exit(address(this), repayAmount);
        }

        logger.logRecipeEvent("McdFLRepayComposite");
        emit ActionEvent("", abi.encode(
            _proxy,
            repayAmount,
            exchangedAmount,
            paybackAmount
        ));
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

    /// @dev workaround for dfsSell expecting context to be proxy
    function owner() external view returns (address) {
        return ACTION_ADDR;
    }
}