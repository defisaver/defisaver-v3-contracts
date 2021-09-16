// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

contract CurveWithdraw is ActionBase, CurveHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    struct Params {
        address sender;     // address where the LP tokens are pulled from
        address receiver;   // address that will receive withdrawn tokens
        address depositTarget;       // depositTarget from which to withdraw
        address lpToken;    // LP token address, needed for approval
        bytes4 sig;         // target contract function signature
        uint256 burnAmount; // amount of LP tokens to burn for withdrawal
        uint256[] withdrawAmounts;   // amount of each token to withdraw
        address[] tokens;       // token addresses, needed for token withdrawal
        bool withdrawExact;     // if set to 'true' this action will withdraw the exact
                                //      amount of each token specified in withdrawAmounts
                                //      and burnAmount will define the upper limit of lp tokens to burn
                                //
                                // if set to 'false' this action will burn the whole burnAmount
                                //      of lp tokens and withdrawAmounts will define the lower limit
                                //      of each token to withdraw
        bool useUnderlying;     // some contracts take this additional parameter
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.sender = _parseParamAddr(params.sender, _paramMapping[0], _subData, _returnValues);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[1], _subData, _returnValues);
        params.depositTarget = _parseParamAddr(params.depositTarget, _paramMapping[2], _subData, _returnValues);
        params.lpToken = _parseParamAddr(params.lpToken, _paramMapping[3], _subData, _returnValues);
        params.burnAmount = _parseParamUint(params.burnAmount, _paramMapping[4], _subData, _returnValues);
        
        uint256 nCoins = params.withdrawAmounts.length;
        require(nCoins == params.tokens.length);
        for (uint256 i = 0; i < params.tokens.length; i++) {
            params.withdrawAmounts[i] = _parseParamUint(params.withdrawAmounts[i], _paramMapping[5 + i], _subData, _returnValues);
            params.tokens[i] = _parseParamAddr(params.tokens[i], _paramMapping[5 + nCoins + i], _subData, _returnValues);
        }

        _curveWithdraw(params);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _curveWithdraw(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws user deposited tokens from depositTarget
    function _curveWithdraw(Params memory _params) internal {
        require(_params.receiver != address(0), "receiver cant be 0x0");
        
        _params.lpToken.pullTokensIfNeeded(_params.sender, _params.burnAmount);
        _params.lpToken.approveToken(_params.depositTarget, _params.burnAmount);
        
        uint256[] memory balances = new uint256[](_params.tokens.length);
        for (uint256 i = 0; i < _params.tokens.length; i++) {
            balances[i] = _params.tokens[i].getBalance(address(this));
        }

        bytes memory payload = _constructPayload(_params.sig, _params.withdrawAmounts, _params.burnAmount, _params.withdrawExact, _params.useUnderlying);

        (bool success, ) = _params.depositTarget.call(payload);
        require(success, "Bad payload or revert in depositTarget contract");

        for (uint256 i = 0; i < _params.tokens.length; i++) {
            uint256 balanceDelta = _params.tokens[i].getBalance(address(this)).sub(balances[i]);
            address tokenAddr = _params.tokens[i];
            if (tokenAddr == TokenUtils.ETH_ADDR) {
                TokenUtils.depositWeth(balanceDelta);
                tokenAddr = TokenUtils.WETH_ADDR;
            }
            tokenAddr.withdrawTokens(_params.receiver, balanceDelta);
        }

        logger.Log(
            address(this),
            msg.sender,
            "CurveWithdraw",
            abi.encode(
                _params
            )
        );
    }

    /// @notice Constructs payload for external contract call
    function _constructPayload(bytes4 _sig, uint256[] memory _withdrawAmounts, uint256 _burnAmount, bool _withdrawExact, bool _useUnderlying) internal pure returns (bytes memory payload) {
        uint256 payloadSize = 4 + (_withdrawAmounts.length + 1) * 32;
        if (_useUnderlying) payloadSize = payloadSize.add(32);
        payload = new bytes(payloadSize);
        
        assembly {
            mstore(add(payload, 0x20), _sig)    // store the selector after dynamic array length field (&callData + 0x20)
            let payloadOffset := 0x4            // skip the selector

            if eq(_withdrawExact, false) {
                mstore(add(payload, 0x24), _burnAmount)    // copy the first arg after the selector (0x20 + 0x4 bytes)
                payloadOffset := 0x24           // skip the first arg and the selector
            }

            let offset := 0x20  // offset of the first element in '_withdrawAmounts'
            for { let i := 0 } lt(i, mload(_withdrawAmounts)) { i := add(i, 1) } {
                mstore(add(payload, add(payloadOffset, offset)), mload(add(_withdrawAmounts, offset)))
                offset := add(offset, 0x20) // offset for next copy
            }

            if eq(_withdrawExact, true) {
                mstore(add(payload, add(0x4, offset)), _burnAmount)     // copy the last arg after the copied array
                offset := add(offset, 0x20) // offset for next copy
            }
            if eq(_useUnderlying, true) {
                mstore(add(payload, add(0x24, offset)), true)
            }
        }
    }
    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}