// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract CurveWithdraw is ActionBase, CurveHelper {
    using TokenUtils for address;

    error CurveWithdrawZeroRecipient();
    error CurveWithdrawWrongArraySize();
    error CurveWithdrawPoolReverted();
    error CurveWithdrawSlippageHit(uint256 coinIndex, uint256 expected, uint256 received);

    struct Params {
        address from;     // address where the LP tokens are pulled from
        address to;   // address that will receive withdrawn tokens
        address depositTarget;       // pool contract or zap deposit contract from which to withdraw
        uint256 burnAmount; // amount of LP tokens to burn for withdrawal
        uint8 flags;
        uint256[] amounts;   // amount of each token to withdraw
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
        params.burnAmount = _parseParamUint(params.burnAmount, _paramMapping[3], _subData, _returnValues);
        params.flags = uint8(_parseParamUint(params.flags, _paramMapping[4], _subData, _returnValues));
        for (uint256 i = 0; i < params.amounts.length; i++) {
            params.amounts[i] = _parseParamUint(params.amounts[i], _paramMapping[5 + i], _subData, _returnValues);
        }

        (uint256 burned, bytes memory logData) = _curveWithdraw(params);
        emit ActionEvent("CurveWithdraw", logData);
        return bytes32(burned);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        ( ,bytes memory logData) = _curveWithdraw(params);
        logger.logActionDirectEvent("CurveWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws user deposited tokens from depositTarget
    function _curveWithdraw(Params memory _params) internal returns (uint256 burned, bytes memory logData) {
        if (_params.to == address(0)) revert CurveWithdrawZeroRecipient();
        (
            DepositTargetType depositTargetType,
            bool explicitUnderlying,
            bool removeOneCoin,
            bool withdrawExact
        ) = parseFlags(_params.flags);
        (
            address lpToken,
            uint256 N_COINS,
            address[8] memory tokens
        ) = _getPoolParams(_params.depositTarget, depositTargetType, explicitUnderlying);
        if (_params.amounts.length != N_COINS) revert CurveWithdrawWrongArraySize();

        _params.burnAmount = lpToken.pullTokensIfNeeded(_params.from, _params.burnAmount);
        burned = lpToken.getBalance(address(this));
        lpToken.approveToken(_params.depositTarget, _params.burnAmount);

        uint256[] memory balances = new uint256[](N_COINS);
        for (uint256 i = 0; i < N_COINS; i++) {
            balances[i] = tokens[i].getBalance(address(this));
        }

        {   // stack too deep, maybe refactor if possible
            bytes memory payload = _constructPayload(
                _params.amounts,
                _params.burnAmount,
                removeOneCoin,
                withdrawExact,
                explicitUnderlying
            );
            (bool success, ) = _params.depositTarget.call(payload);
            if (!success) revert CurveWithdrawPoolReverted();
        }

        for (uint256 i = 0; i < N_COINS; i++) {
            uint256 balanceDelta = tokens[i].getBalance(address(this)) - balances[i];
            address tokenAddr = tokens[i];
            // some curve pools will disrespect the minOutAmounts via rounding error and will not revert
            // we tolerate this error up to 1bps (1 / 1_00_00)
            // otherwise slippage shouldn't exist and the pool contract should revert if unable to withdraw the specified amounts
            // however we do this check in case of an invalid deposit zap
            if (balanceDelta < (_params.amounts[i] - _params.amounts[i] / 1_00_00)) revert CurveWithdrawSlippageHit(i, _params.amounts[i], balanceDelta);
            if (tokenAddr == TokenUtils.ETH_ADDR) {
                TokenUtils.depositWeth(balanceDelta);
                tokenAddr = TokenUtils.WETH_ADDR;
            }
            tokenAddr.withdrawTokens(_params.to, balanceDelta);
        }

        logData = abi.encode(_params);
        burned -= lpToken.getBalance(address(this));
    }

    /// @notice Constructs payload for external contract call
    function _constructPayload(uint256[] memory _amounts, uint256 _burnAmount, bool _removeOneCoin, bool _withdrawExact, bool _explicitUnderlying) internal pure returns (bytes memory payload) {
        bytes memory sig;
        bytes4 selector;
        bytes memory optional;
        assert(_amounts.length < 9); // sanity check
        if (_removeOneCoin) {
            uint256 tokenIndex;
            for (; tokenIndex < _amounts.length; tokenIndex++) {
                if (_amounts[tokenIndex] != 0) break;
            }

            if (_explicitUnderlying) {
                sig = "remove_liquidity_one_coin(uint256,int128,uint256,bool)";
                optional = abi.encode(uint256(1));
            } else {
                sig = "remove_liquidity_one_coin(uint256,int128,uint256)";
            }

            selector = bytes4(keccak256(sig));

            payload = bytes.concat(abi.encodePacked(selector, _burnAmount, tokenIndex, _amounts[tokenIndex]), optional);
        } else if (!_withdrawExact) {
            if (_explicitUnderlying) {
                sig = "remove_liquidity(uint256,uint256[0],bool)";
                //                           index = 33 ^
                optional = abi.encode(uint256(1));
            } else {
                sig = "remove_liquidity(uint256,uint256[0])";
            }
            sig[33] = bytes1(uint8(sig[33]) + uint8(_amounts.length));
            selector = bytes4(keccak256(sig));

            payload = bytes.concat(abi.encodePacked(selector, _burnAmount, _amounts), optional);
        } else {
            if (_explicitUnderlying) {
                sig = "remove_liquidity_imbalance(uint256[0],uint256,bool)";
                //                             index = 35 ^
                optional = abi.encode(uint256(1));
            } else {
                sig = "remove_liquidity_imbalance(uint256[0],uint256)";
            }
            sig[35] = bytes1(uint8(sig[35]) + uint8(_amounts.length));
            selector = bytes4(keccak256(sig));

            payload = bytes.concat(abi.encodePacked(selector, _amounts, _burnAmount), optional);
        }
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}