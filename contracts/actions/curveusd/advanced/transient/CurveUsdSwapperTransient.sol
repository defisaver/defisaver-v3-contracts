// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SafeERC20 } from "../../../../utils/SafeERC20.sol";
import { IERC20 } from "../../../../interfaces/IERC20.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { AdminAuth } from "../../../../auth/AdminAuth.sol";
import { DFSExchangeWithTxSaver } from "../../../../exchangeV3/DFSExchangeWithTxSaver.sol";
import { DFSExchangeData } from "../../../../exchangeV3/DFSExchangeData.sol";
import { FeeRecipient } from "../../../../utils/FeeRecipient.sol";
import { ActionsUtilHelper } from "../../../utils/helpers/ActionsUtilHelper.sol";
import { DFSRegistry } from "../../../../core/DFSRegistry.sol";
import { GasFeeHelper } from "../../../../actions/fee/helpers/GasFeeHelper.sol";
import { ReentrancyGuardTransient } from "../../../../utils/ReentrancyGuardTransient.sol";

import { CurveUsdHelper } from "../../helpers/CurveUsdHelper.sol";
import { ICrvUsdController } from "../../../../interfaces/curveusd/ICurveUsd.sol";


/// @title CurveUsdSwapperTransient Callback contract for CurveUsd extended actions with transient storage
contract CurveUsdSwapperTransient is
    CurveUsdHelper,
    DFSExchangeWithTxSaver,
    AdminAuth,
    ActionsUtilHelper,
    GasFeeHelper,
    ReentrancyGuardTransient
{
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @dev Divider for automation fee, 5 bps
    uint256 internal constant AUTOMATION_DFS_FEE = 2000;

    struct CallbackData {
        uint256 stablecoins;
        uint256 collateral;
    }

    modifier onlyValidCrvUsdController(address _sender) {
        if (!isControllerValid(msg.sender)) {
            revert CurveUsdInvalidController();
        }
        _;
    }

    /// @dev Called by curveusd controller after 'repay_extended' method
    /// @dev sends all collateral the user has to this contract, we swap a part or all of it
    /// @dev After swapping, position will be recreated on curveusd or closed fully
    function callback_repay(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory info
    ) external onlyValidCrvUsdController(msg.sender) returns (CallbackData memory cb) {
        uint256 gasUsed = info[0];

        ExchangeData memory exData = abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        address collToken = exData.srcAddr;
        address debtToken = exData.destAddr;

        uint256 receivedAmount = _performSell(exData, _user, debtToken, gasUsed);

        // how much collateral we have left after sell
        cb.collateral = collToken.getBalance(address(this));

        // receivedAmount is how many crvUsd we got after the trade that will be the repay amount
        // if receivedAmount > current debt, leftover coll will be returned and receivedAmount-currentDebt will be returned
        // if receivedAmount < current debt, new position will be created with leftover coll and currentDebt-receivedAmount
        cb.stablecoins = receivedAmount;

        // approve the controller to create new position
        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
        IERC20(debtToken).safeApprove(msg.sender, cb.stablecoins);
    }

    /// @dev Called by curveusd controller after 'create_loan_extended' and 'borrow_more_extended' methods
    /// @dev sends exData.srcAmount of curveUsd token to this contract for us to sell then pulls received coll token
    function callback_deposit(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory info
    ) external onlyValidCrvUsdController(msg.sender) returns (CallbackData memory cb) {
        uint256 gasUsed = info[0];

        ExchangeData memory exData = abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        address collToken = exData.destAddr;

        uint256 receivedAmount = _performSell(exData, _user, collToken, gasUsed);

        cb.collateral = receivedAmount;

        // approve the controller to pull the collateral
        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
    }

    function callback_liquidate(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory info
    ) external onlyValidCrvUsdController(msg.sender) returns (CallbackData memory cb) {
        uint256 gasUsed = info[0];
        bool sellAllCollateral = info[1] == 1 ? true : false;

        ExchangeData memory exData = abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        address collToken = exData.srcAddr;
        address debtToken = exData.destAddr;

        if (sellAllCollateral) {
            exData.srcAmount = collToken.getBalance(address(this));
        }

        uint256 receivedAmount = _performSell(exData, _user, debtToken, gasUsed);

        cb.stablecoins = receivedAmount;
        cb.collateral = IERC20(collToken).balanceOf(address(this));

        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
        IERC20(debtToken).safeApprove(msg.sender, cb.stablecoins);
    }

    /// @dev No funds should be stored on this contract, but if anything is left send back to the user
    /// @dev This function is called during action execution, after performing sell through the swapper contract
    function withdrawAll(address _controllerAddress) external nonReentrant {
        address collToken = ICrvUsdController(_controllerAddress).collateral_token();
        address debtToken = CRVUSD_TOKEN_ADDR;

        collToken.withdrawTokens(msg.sender, type(uint256).max);
        debtToken.withdrawTokens(msg.sender, type(uint256).max);
    }

    function _performSell(
        DFSExchangeData.ExchangeData memory _exData,
        address _user,
        address _feeToken,
        uint256 _gasUsedForAutomation
    ) internal returns (uint256) {
        (, uint256 receivedAmount, bool hasFee, bool txSaverFeeTaken) = _sellWithTxSaverChoice(
            _exData,
            _user,
            DFSRegistry(REGISTRY_ADDR)
        );

        // can't take both automation fee and TxSaver fee
        if (_gasUsedForAutomation > 0 && !txSaverFeeTaken) {
            receivedAmount -= _takeAutomationFee(
                receivedAmount,
                _feeToken,
                _gasUsedForAutomation,
                hasFee
            );
        }

        return receivedAmount;
    }

    function _takeAutomationFee(
        uint256 _destTokenAmount,
        address _token,
        uint256 _gasUsed,
        bool hasFee
    ) internal returns (uint256 feeAmount) {
        // we need to take the fee for tx cost as well, as it's in a strategy
        feeAmount += calcGasCost(_gasUsed, _token, 0);

        // gas fee can't go over 20% of the whole amount
        if (feeAmount > (_destTokenAmount / 5)) {
            feeAmount = _destTokenAmount / 5;
        }
        // if user has been whitelisted we don't take 0.05% fee
        if (hasFee) {
            feeAmount += _destTokenAmount / AUTOMATION_DFS_FEE;
        }

        address walletAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();
        _token.withdrawTokens(walletAddr, feeAmount);
    }
}
