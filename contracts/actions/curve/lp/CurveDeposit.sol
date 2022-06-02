// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract CurveDeposit is ActionBase, CurveHelper {
    using TokenUtils for address;

    error CurveDepositZeroRecipient();
    error CurveDepositWrongArraySize();
    error CurveDepositPoolReverted();
    error CurveDepositSlippageHit(uint256 expected, uint256 received);

    struct Params {
        address from;         // address where to pull tokens from
        address to;       // address that will receive the LP tokens
        address depositTarget;  // pool contract or zap deposit contract in which to deposit
        uint256 minMintAmount;  // minimum amount of LP tokens to accept
        uint8 flags;
        uint256[] amounts;      // amount of each token to deposit
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.depositTarget = _parseParamAddr(params.depositTarget, _paramMapping[2], _subData, _returnValues);
        params.minMintAmount = _parseParamUint(params.minMintAmount, _paramMapping[3], _subData, _returnValues);
        params.flags = uint8(_parseParamUint(params.flags, _paramMapping[4], _subData, _returnValues));
        for (uint256 i = 0; i < params.amounts.length; i++) {
            params.amounts[i] = _parseParamUint(params.amounts[i], _paramMapping[5 + i], _subData, _returnValues);
        }

        (uint256 received, bytes memory logData) = _curveDeposit(params);
        emit ActionEvent("CurveDeposit", logData);
        return bytes32(received);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _curveDeposit(params);
        logger.logActionDirectEvent("CurveDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Deposits tokens into liquidity pool
    function _curveDeposit(Params memory _params) internal returns (uint256 received, bytes memory logData) {
        if (_params.to == address(0)) revert CurveDepositZeroRecipient();
        (
            DepositTargetType depositTargetType,
            bool explicitUnderlying,
        ) = parseFlags(_params.flags);
        (
            address lpToken,
            uint256 N_COINS,
            address[8] memory tokens
        ) = _getPoolParams(_params.depositTarget, depositTargetType, explicitUnderlying);
        if (_params.amounts.length != N_COINS) revert CurveDepositWrongArraySize();

        uint256 tokensBefore = lpToken.getBalance(address(this));
        uint256 msgValue;
        for (uint256 i = 0; i < N_COINS; i++) {
            if (tokens[i] == TokenUtils.ETH_ADDR) {
                _params.amounts[i] = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.amounts[i]);
                TokenUtils.withdrawWeth(_params.amounts[i]);
                msgValue = _params.amounts[i];
                continue;
            }
            _params.amounts[i] = tokens[i].pullTokensIfNeeded(_params.from, _params.amounts[i]);
            tokens[i].approveToken(_params.depositTarget, _params.amounts[i]);
        }

        bytes memory payload = _constructPayload(_params.amounts, _params.minMintAmount, explicitUnderlying);
        (bool success, ) = _params.depositTarget.call{ value: msgValue }(payload);
        if (!success) revert CurveDepositPoolReverted();

        received = lpToken.getBalance(address(this)) - tokensBefore;
        if (received < _params.minMintAmount) revert CurveDepositSlippageHit(_params.minMintAmount, received);
        lpToken.withdrawTokens(_params.to, received);

        logData = abi.encode(_params, received);
    }

    /// @notice Constructs payload for external contract call
    function _constructPayload(uint256[] memory _amounts, uint256 _minMintAmount, bool _explicitUnderlying) internal pure returns (bytes memory payload) {
        bytes memory sig;
        bytes4 selector;
        bytes memory optional;
        assert(_amounts.length < 9); // sanity check
        if (_explicitUnderlying) {
            sig = "add_liquidity(uint256[0],uint256,bool)";
            //                index = 22 ^
            optional = abi.encode(uint256(1));
        } else {
            sig = "add_liquidity(uint256[0],uint256)";
        }
        sig[22] = bytes1(uint8(sig[22]) + uint8(_amounts.length));
        selector = bytes4(keccak256(sig));

        return payload = bytes.concat(abi.encodePacked(selector, _amounts, _minMintAmount), optional);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}