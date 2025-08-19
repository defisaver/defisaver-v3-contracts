// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC4626 } from "../../../interfaces/IERC4626.sol";
import { IERC4626StakeToken } from "../../../interfaces/aaveV3/IERC4626StakeToken.sol";
import { IStaticATokenV2 } from "../../../interfaces/aaveV3/IStaticATokenV2.sol";
import { ActionBase } from "../../ActionBase.sol";
import { AaveV3Helper } from "../helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title UmbrellaStake - Stake aTokens/underlying or GHO tokens using Umbrella Stake Token
/// @notice This action will always pull aTokens or underlying for non GHO staking and wrap them into waTokens for staking.
contract UmbrellaStake is ActionBase, AaveV3Helper  {
    using TokenUtils for address;

    error UmbrellaStakeSlippageHit(
        uint256 minSharesOut,
        uint256 sharesReceived
    );
 
    /// @param stkToken The umbrella stake token.
    /// @param from The address from which the aToken or GHO will be pulled.
    /// @param to The address to which the stkToken will be transferred
    /// @param amount The amount of aToken/underlying or GHO to be staked.
    /// @param useATokens Whether to use aTokens or underlying for staking (e.g. aUSDC or USDC).
    /// @param minSharesOut The minimum amount of stkToken shares to receive.
    struct Params {
        address stkToken;
        address from;
        address to;
        uint256 amount;
        bool useATokens;
        uint256 minSharesOut;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.stkToken = _parseParamAddr(params.stkToken, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.useATokens = _parseParamUint(params.useATokens ? 1 : 0, _paramMapping[4], _subData, _returnValues) == 1;
        params.minSharesOut = _parseParamUint(params.minSharesOut, _paramMapping[5], _subData, _returnValues);

        (uint256 stkTokenShares, bytes memory logData) = _stake(params);
        emit ActionEvent("UmbrellaStake", logData);
        return bytes32(stkTokenShares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _stake(params);
        logger.logActionDirectEvent("UmbrellaStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _stake(Params memory _params) internal returns (uint256, bytes memory) {
        address waTokenOrGHO = IERC4626(_params.stkToken).asset();

        // If no from address is provided, use user's wallet address
        if (_params.from == address(0)) {
            _params.from = address(this);
        }

        // If no to address is provided, use user's wallet address
        if (_params.to == address(0)) {
            _params.to = address(this);
        }

        if (waTokenOrGHO == GHO_TOKEN) {
            _params.amount = GHO_TOKEN.pullTokensIfNeeded(_params.from, _params.amount);
        } else {
            // For non GHO staking, we always pull aTokens or underlying and wrap them into waTokens before staking
            if (_params.useATokens) {
                address aToken = IStaticATokenV2(waTokenOrGHO).aToken();
                _params.amount = aToken.pullTokensIfNeeded(_params.from, _params.amount);
                _params.amount = _wrapATokensToWaTokens(aToken, waTokenOrGHO, _params.amount);
            } else {
                address underlying = IERC4626(waTokenOrGHO).asset();
                _params.amount = underlying.pullTokensIfNeeded(_params.from, _params.amount);
                _params.amount = _wrapUnderlyingToWaTokens(underlying, waTokenOrGHO, _params.amount);
            }
        }

        waTokenOrGHO.approveToken(_params.stkToken, _params.amount);

        uint256 shares = IERC4626StakeToken(_params.stkToken).deposit(
            _params.amount,
            _params.to
        );

        if (shares < _params.minSharesOut) {
            revert UmbrellaStakeSlippageHit(_params.minSharesOut, shares);    
        }

        return (shares, abi.encode(_params, shares));
    }

    /// @notice Wraps aTokens into waTokens.
    /// @param _aToken The aToken to wrap.
    /// @param _waToken The wrapped aToken.
    /// @param _amount The amount of aTokens to wrap.
    /// @return The amount of waTokens received.
    function _wrapATokensToWaTokens(
        address _aToken,
        address _waToken,
        uint256 _amount
    ) internal returns (uint256) {
        _aToken.approveToken(_waToken, _amount);

        uint256 waTokenAmount = IStaticATokenV2(_waToken).depositATokens(
            _amount,
            address(this) /* receiver */
        );

        return waTokenAmount;
    }

    /// @notice Wraps underlying asset into waTokens.
    /// @param _underlying The underlying asset to wrap.
    /// @param _waToken The wrapped aToken.
    /// @param _amount The amount of underlying asset to wrap.
    /// @return The amount of waTokens received.
    function _wrapUnderlyingToWaTokens(
        address _underlying,
        address _waToken,
        uint256 _amount
    ) internal returns (uint256) {
        _underlying.approveToken(_waToken, _amount);

        uint256 waTokenAmount = IERC4626(_waToken).deposit(
            _amount,
            address(this) /* receiver */
        );

        return waTokenAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}