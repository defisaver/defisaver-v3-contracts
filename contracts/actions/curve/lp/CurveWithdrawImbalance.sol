// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

contract CurveWithdrawImbalance is ActionBase, CurveHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    struct Params {
        address sender;     // address where the LP tokens are pulled from
        address receiver;   // address that will receive withdrawn tokens
        address pool;       // pool from which to withdraw
        address lpToken;    // LP token address, needed for approval
        bytes4 sig;         // target contract function signature
        uint256 maxBurnAmount;  // maximum amount of LP tokens to use for withdrawal
        uint256[] amounts;      // amount of each token to withdraw
        address[] tokens;       // token addresses, needed for token withdrawal
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
        params.pool = _parseParamAddr(params.pool, _paramMapping[2], _subData, _returnValues);
        params.lpToken = _parseParamAddr(params.lpToken, _paramMapping[3], _subData, _returnValues);
        params.maxBurnAmount = _parseParamUint(params.maxBurnAmount, _paramMapping[4], _subData, _returnValues);
        
        uint256 N_COINS = params.amounts.length;
        require(N_COINS == params.tokens.length);
        for (uint256 i = 0; i < params.tokens.length; i++) {
            params.amounts[i] = _parseParamUint(params.amounts[i], _paramMapping[5 + i], _subData, _returnValues);
            params.tokens[i] = _parseParamAddr(params.tokens[i], _paramMapping[5 + N_COINS + i], _subData, _returnValues);
        }

        uint256 burnedAmount = _curveWithdrawImbalance(params);
        return bytes32(burnedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _curveWithdrawImbalance(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws user deposited tokens from pool
    function _curveWithdrawImbalance(Params memory _params) internal returns (uint256) {
        require(_params.receiver != address(0), "receiver cant be 0x0");
        
        _params.lpToken.pullTokensIfNeeded(_params.sender, _params.maxBurnAmount);
        _params.lpToken.approveToken(_params.pool, _params.maxBurnAmount);

        uint256 lpTokenBalance = _params.lpToken.getBalance(address(this));

        bytes memory payload = _constructPayload(_params.sig, _params.amounts, _params.maxBurnAmount, _params.useUnderlying);
        (bool success, ) = _params.pool.call(payload);
        require(success, "Bad payload or revert in pool contract");

        uint256 burnedAmount = lpTokenBalance.sub(_params.lpToken.getBalance(address(this)));

        for (uint256 i = 0; i < _params.tokens.length; i++) {
            address tokenAddr = _params.tokens[i];
            if (tokenAddr == TokenUtils.ETH_ADDR) {
                TokenUtils.depositWeth(_params.amounts[i]);
                tokenAddr = TokenUtils.WETH_ADDR;
            }
            tokenAddr.withdrawTokens(_params.receiver, _params.amounts[i]);
        }

        _params.lpToken.withdrawTokens(_params.receiver, _params.maxBurnAmount.sub(burnedAmount));

        logger.Log(
            address(this),
            msg.sender,
            "CurveWithdrawImbalance",
            abi.encode(
                _params,
                burnedAmount
            )
        );

        return burnedAmount;
    }

    /// @notice Constructs payload for external contract call
    function _constructPayload(bytes4 _sig, uint256[] memory _amounts, uint256 _maxBurnAmount, bool _useUnderlying) internal pure returns (bytes memory payload) {
        uint256 payloadSize = 4 + (_amounts.length + 1) * 32;
        if (_useUnderlying) payloadSize = payloadSize.add(32);
        payload = new bytes(payloadSize);
        
        assembly {
            mstore(add(payload, 0x20), _sig)    // store the signature after dynamic array length field (&callData + 0x20)

            let offset := 0x20  // offset of the first element in '_amounts'
            for { let i := 0 } lt(i, mload(_amounts)) { i := add(i, 1) } {
                mstore(add(payload, add(0x4, offset)), mload(add(_amounts, offset)))   // payload offset needs to account for 0x4 bytes of selector and 0x20 bytes for _maxBurnAmount arg
                offset := add(offset, 0x20) // offset for next copy
            }

            mstore(add(payload, add(0x4, offset)), _maxBurnAmount)
            if eq(_useUnderlying, true) {
                offset := add(offset, 0x20)
                mstore(add(payload, add(0x4, offset)), true)
            }
        }
    }
    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}