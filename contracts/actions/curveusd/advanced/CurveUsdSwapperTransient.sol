// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../../../interfaces/token/IERC20.sol";
import { IDFSRegistry } from "../../../interfaces/core/IDFSRegistry.sol";
import { ICrvUsdController } from "../../../interfaces/protocols/curveusd/ICurveUsd.sol";
import {
    ICurveUsdSwapperTransient
} from "../../../interfaces/protocols/curveusd/ICurveUsdSwapperTransient.sol";

import { SafeERC20 } from "../../../_vendor/openzeppelin/SafeERC20.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { AdminAuth } from "../../../auth/AdminAuth.sol";
import { DFSExchangeWithTxSaver } from "../../../exchangeV3/DFSExchangeWithTxSaver.sol";
import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";
import { FeeRecipient } from "../../../utils/fee/FeeRecipient.sol";
import { ActionsUtilHelper } from "../../utils/helpers/ActionsUtilHelper.sol";
import { GasFeeHelper } from "../../../actions/fee/helpers/GasFeeHelper.sol";
import { StorageSlot } from "../../../_vendor/openzeppelin/StorageSlot.sol";
import {
    ReentrancyGuardTransient
} from "../../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { CurveUsdHelper } from "../helpers/CurveUsdHelper.sol";

/// @title CurveUsdSwapperTransient
/// @notice Callback contract for Curve USD extended actions with transient storage.
/// @dev No funds are meant to stay here between actions.
contract CurveUsdSwapperTransient is
    CurveUsdHelper,
    DFSExchangeWithTxSaver,
    AdminAuth,
    ActionsUtilHelper,
    GasFeeHelper,
    ReentrancyGuardTransient,
    ICurveUsdSwapperTransient
{
    using SafeERC20 for IERC20;
    using TokenUtils for address;
    using StorageSlot for *;

    /*//////////////////////////////////////////////////////////////
                           CONSTANTS
    //////////////////////////////////////////////////////////////*/
    /// @dev Divider for automation fee, 5 bps
    uint256 internal constant AUTOMATION_DFS_FEE = 2000;

    /// @dev keccak256("dfs.storage.CurveUsdSwapperTransient.callbackUser")
    bytes32 private constant CALLBACK_USER_SLOT =
        0x344f1f9fb9731c537a5e8c29edc2b09d77e2cadcedbb7c206a67cb30b851a586;

    /*//////////////////////////////////////////////////////////////
                            ERRORS
    //////////////////////////////////////////////////////////////*/
    /// Exchange is not selling the market tokens in the expected direction
    error InvalidExchangeTokens();

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyValidCrvUsdController(address _sender) {
        if (!isControllerValid(_sender)) {
            revert CurveUsdInvalidController();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                      CONTROLLER CALLBACKS
    //////////////////////////////////////////////////////////////*/
    /// @dev Called by curveusd controller after 'repay_extended' method
    /// @dev sends all collateral the user has to this contract, we swap a part or all of it
    /// @dev After swapping, position will be recreated on curveusd or closed fully
    function callback_repay(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory _callbackArgs
    ) external nonReentrant onlyValidCrvUsdController(msg.sender) returns (CallbackData memory cb) {
        uint256 gasUsed = _callbackArgs[0];

        address collToken = ICrvUsdController(msg.sender).collateral_token();
        address debtToken = CRVUSD_TOKEN_ADDR;

        ExchangeData memory exData =
            abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        _validateExchangeTokens(exData, collToken, debtToken);
        _setCallbackUser(_user);

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
        uint256[] memory _callbackArgs
    ) external nonReentrant onlyValidCrvUsdController(msg.sender) returns (CallbackData memory cb) {
        uint256 gasUsed = _callbackArgs[0];

        address collToken = ICrvUsdController(msg.sender).collateral_token();
        address debtToken = CRVUSD_TOKEN_ADDR;

        ExchangeData memory exData =
            abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        _validateExchangeTokens(exData, debtToken, collToken);
        _setCallbackUser(_user);

        uint256 receivedAmount = _performSell(exData, _user, collToken, gasUsed);

        // partial fill: the wrapper refunds what it could not sell, send it back to the wallet
        debtToken.withdrawTokens(_user, type(uint256).max);

        cb.collateral = receivedAmount;

        // approve the controller to pull the collateral
        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
    }

    /// @dev Called by curveusd controller after 'liquidate_extended' method
    /// @dev sends all collateral the user has to this contract, we swap a part or all depending on sellAllCollateral flag
    function callback_liquidate(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory _callbackArgs
    ) external nonReentrant onlyValidCrvUsdController(msg.sender) returns (CallbackData memory cb) {
        uint256 gasUsed = _callbackArgs[0];
        bool sellAllCollateral = _callbackArgs[1] == 1 ? true : false;

        address collToken = ICrvUsdController(msg.sender).collateral_token();
        address debtToken = CRVUSD_TOKEN_ADDR;

        ExchangeData memory exData =
            abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        _validateExchangeTokens(exData, collToken, debtToken);
        _setCallbackUser(_user);

        if (sellAllCollateral) {
            exData.srcAmount = collToken.getBalance(address(this));
        }

        uint256 receivedAmount = _performSell(exData, _user, debtToken, gasUsed);

        cb.stablecoins = receivedAmount;
        cb.collateral = IERC20(collToken).balanceOf(address(this));

        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
        IERC20(debtToken).safeApprove(msg.sender, cb.stablecoins);
    }

    /*//////////////////////////////////////////////////////////////
                             PUBLIC
    //////////////////////////////////////////////////////////////*/
    /// @dev Sends remaining collateral and debt tokens to the caller
    /// @dev Returns without transferring if the caller is not the last callback user in this tx.
    ///      Liquidations can skip the callback when the AMM already holds enough debt tokens.
    function withdrawAll(address _controllerAddress) external nonReentrant {
        if (msg.sender != callbackUser()) return;

        address collToken = ICrvUsdController(_controllerAddress).collateral_token();
        address debtToken = CRVUSD_TOKEN_ADDR;

        collToken.withdrawTokens(msg.sender, type(uint256).max);
        debtToken.withdrawTokens(msg.sender, type(uint256).max);
    }

    /// @notice Wallet the last callback in this transaction ran for
    function callbackUser() public view returns (address) {
        return CALLBACK_USER_SLOT.asAddress().tload();
    }

    /// @dev Accepts ETH dust from exchange wrappers. Not refunded.
    ///      Recoverable by the owner via withdrawStuckFunds.
    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL
    //////////////////////////////////////////////////////////////*/
    function _validateExchangeTokens(
        DFSExchangeData.ExchangeData memory _exData,
        address _srcToken,
        address _destToken
    ) internal pure {
        if (_exData.srcAddr != _srcToken || _exData.destAddr != _destToken) {
            revert InvalidExchangeTokens();
        }
    }

    function _setCallbackUser(address _user) internal {
        CALLBACK_USER_SLOT.asAddress().tstore(_user);
    }

    function _performSell(
        DFSExchangeData.ExchangeData memory _exData,
        address _user,
        address _feeToken,
        uint256 _gasUsedForAutomation
    ) internal returns (uint256) {
        (, uint256 receivedAmount, bool hasFee, bool txSaverFeeTaken) = _sellWithTxSaverChoice(
            _exData, _user, IDFSRegistry(REGISTRY_ADDR)
        );

        // can't take both automation fee and TxSaver fee
        if (_gasUsedForAutomation > 0 && !txSaverFeeTaken) {
            receivedAmount -= _takeAutomationFee(
                receivedAmount, _feeToken, _gasUsedForAutomation, hasFee
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
