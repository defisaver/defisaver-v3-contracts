// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "./helpers/BalancerV2Helper.sol";

/// @title Supply tokens to a Balancer V2 Pool for pool LP tokens in return
contract BalancerV2Supply is ActionBase, DSMath, BalancerV2Helper {
    using TokenUtils for address;

    struct Params {
        bytes32 poolId;
        address from;
        address to;
        IAsset[] tokens;
        uint256[] maxAmountsIn;
        bytes userData;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.from = _parseParamAddr(inputData.from, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);
        for (uint256 i = 0; i < inputData.maxAmountsIn.length; i++){
            inputData.maxAmountsIn[i] = _parseParamUint(inputData.maxAmountsIn[i], _paramMapping[2+i], _subData, _returnValues);
        }

        uint256 poolLPTokensReceived = _balancerSupply(inputData);
        return bytes32(poolLPTokensReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _balancerSupply(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _balancerSupply(Params memory _inputData) internal returns (uint256 poolLPTokensReceived) {
        require(_inputData.to != address(0), ADDR_MUST_NOT_BE_ZERO);
        address poolAddress = _getPoolAddress(_inputData.poolId);
        uint256 poolLPTokensBefore = poolAddress.getBalance(_inputData.to);

        uint256[] memory tokenBalances = new uint256[](_inputData.tokens.length);
        for (uint256 i = 0; i < tokenBalances.length; i++) {
            tokenBalances[i] = address(_inputData.tokens[i]).getBalance(address(this));
        }
        
        _prepareTokensForPoolJoin(_inputData);
        IVault.JoinPoolRequest memory requestData = IVault.JoinPoolRequest(
            _inputData.tokens,
            _inputData.maxAmountsIn,
            _inputData.userData,
            false
        );
        vault.joinPool(_inputData.poolId, address(this), _inputData.to, requestData);

        for (uint256 i = 0; i < tokenBalances.length; i++) {
            tokenBalances[i] = sub(
                address(_inputData.tokens[i]).getBalance(address(this)),
                tokenBalances[i]
            );
            // sending leftovers back
            address(_inputData.tokens[i]).withdrawTokens(_inputData.from, tokenBalances[i]);
        }

        uint256 poolLPTokensAfter = poolAddress.getBalance(_inputData.to);
        poolLPTokensReceived = sub(poolLPTokensAfter, poolLPTokensBefore);

        logger.Log(
            address(this),
            msg.sender,
            "BalancerV2Supply",
            abi.encode(_inputData, tokenBalances, poolLPTokensReceived)
        );
    }

    function _prepareTokensForPoolJoin(Params memory _inputData) internal {
        for (uint256 i = 0; i < _inputData.tokens.length; i++) {
            // pull tokens to proxy and write how many are pulled
            _inputData.maxAmountsIn[i] = address(_inputData.tokens[i]).pullTokensIfNeeded(
                _inputData.from,
                _inputData.maxAmountsIn[i]
            );
            // approve vault so it can pull tokens
            address(_inputData.tokens[i]).approveToken(address(vault), _inputData.maxAmountsIn[i]);
        }
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
