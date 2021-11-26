// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

contract CurveDeposit is ActionBase, CurveHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    struct Params {
        address sender;         // address where to pull tokens from
        address receiver;       // address that will receive the LP tokens
        address depositTarget;  // pool contract or zap deposit contract in which to deposit
        address lpToken;        // LP token of the pool
        bytes4 sig;             // target contract function signature
        uint256 minMintAmount;  // minimum amount of LP tokens to accept
        uint256[] amounts;      // amount of each token to deposit
        address[] tokens;       // tokens to deposit, needed for token approval
        bool useUnderlying;     // some contracts take this additional parameter
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.sender = _parseParamAddr(params.sender, _paramMapping[0], _subData, _returnValues);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[1], _subData, _returnValues);
        params.minMintAmount = _parseParamUint(params.minMintAmount, _paramMapping[2], _subData, _returnValues);
        
        require(params.amounts.length == params.tokens.length, "amounts and tokens array length mismatch");
        for (uint256 i = 0; i < params.amounts.length; i++) {
            params.amounts[i] = _parseParamUint(params.amounts[i], _paramMapping[3 + i], _subData, _returnValues);
        }

        uint256 received = _curveDeposit(params);
        return bytes32(received);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _curveDeposit(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Deposits tokens into liquidity pool
    function _curveDeposit(Params memory _params) internal returns (uint256) {
        require(_params.receiver != address(0), "receiver cant be 0x0");

        uint256 tokensBefore = _params.lpToken.getBalance(address(this));
        uint256 msgValue;

        for (uint256 i = 0; i < _params.tokens.length; i++) {
            if (_params.tokens[i] == TokenUtils.ETH_ADDR) {
                TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.sender, _params.amounts[i]);
                TokenUtils.withdrawWeth(_params.amounts[i]);
                msgValue = _params.amounts[i];
                continue;
            }
            _params.tokens[i].pullTokensIfNeeded(_params.sender, _params.amounts[i]);
            _params.tokens[i].approveToken(_params.depositTarget, _params.amounts[i]);
        }

        bytes memory payload = _constructPayload(_params.sig, _params.amounts, _params.minMintAmount, _params.useUnderlying);
        (bool success, ) = _params.depositTarget.call{ value: msgValue }(payload);
        require(success, "Bad payload or revert in pool contract");

        uint256 received = _params.lpToken.getBalance(address(this)).sub(tokensBefore);
        _params.lpToken.withdrawTokens(_params.receiver, received);

        logger.Log(
            address(this),
            msg.sender,
            "CurveDeposit",
            abi.encode(
                _params,
                received
            )
        );

        return received;
    }

    /// @notice Constructs payload for external contract call
    function _constructPayload(bytes4 _sig, uint256[] memory _amounts, uint256 _minMintAmount, bool _useUnderlying) internal pure returns (bytes memory payload) {
        uint256 payloadSize = 4 + (_amounts.length + 1) * 32;
        if (_useUnderlying) payloadSize = payloadSize.add(32);
        payload = new bytes(payloadSize);

        assembly {
            mstore(add(payload, 0x20), _sig)    // store the signature after dynamic array length field (&callData + 0x20)

            let offset := 0x20  // offset of the first element in '_amounts'
            for { let i := 0 } lt(i, mload(_amounts)) { i := add(i, 1) } {
                mstore(add(payload, add(0x4, offset)), mload(add(_amounts, offset)))    // payload offset needs to account for 0x4 bytes of selector
                offset := add(offset, 0x20) // offset for next copy
            }

            mstore(add(payload, add(0x4, offset)), _minMintAmount)
            if eq(_useUnderlying, true) {
                offset := add(offset, 0x20) // offset for final conditional copy
                mstore(add(payload, add(0x4, offset)), true)
            }
        }
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}