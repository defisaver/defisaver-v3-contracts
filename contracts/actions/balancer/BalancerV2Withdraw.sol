// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/balancer/IVault.sol";
import "../../DS/DSMath.sol";
import "hardhat/console.sol";

contract BalancerV2Withdraw is ActionBase, DSMath {
    using TokenUtils for address;

    IVault public constant vault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

    struct Params {
        bytes32 poolId;
        address from;
        address to;
        uint256 lpTokenAmount;
        IAsset[] tokens;
        uint256[] minAmountsOut;
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
        inputData.lpTokenAmount = _parseParamUint(
            inputData.lpTokenAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        _balancerWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _balancerWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _balancerWithdraw(Params memory _inputData) internal {
        address poolAddress = _getPoolAddress(_inputData.poolId);
        uint256 poolLPTokensBefore = poolAddress.getBalance(address(this));
        console.log(poolLPTokensBefore);
        _inputData.lpTokenAmount = poolAddress.pullTokensIfNeeded(
            _inputData.from,
            _inputData.lpTokenAmount
        );
        console.log(_inputData.lpTokenAmount);
        poolAddress.approveToken(address(vault), _inputData.lpTokenAmount);
        uint256[] memory tokenBalancesBefore = new uint256[](_inputData.tokens.length);
        for (uint256 i = 0; i < tokenBalancesBefore.length; i++) {
            tokenBalancesBefore[i] = address(_inputData.tokens[i]).getBalance(_inputData.to);
            console.log(tokenBalancesBefore[i]);
        }

        IVault.ExitPoolRequest memory requestData = IVault.ExitPoolRequest(
            _inputData.tokens,
            _inputData.minAmountsOut,
            _inputData.userData,
            false
        );
        vault.exitPool(_inputData.poolId, address(this), payable(_inputData.to), requestData);
        console.log("exit");
        for (uint256 i = 0; i < tokenBalancesBefore.length; i++) {
            tokenBalancesBefore[i] = sub(
                address(_inputData.tokens[i]).getBalance(_inputData.to),
                tokenBalancesBefore[i]
            );
            // sending leftovers back
            console.log(tokenBalancesBefore[i]);
        }

        uint256 poolLPTokensAfter = poolAddress.getBalance(address(this));

        console.log(_inputData.lpTokenAmount);
        console.log(poolLPTokensAfter);
        uint256 poolLPTokensSent = sub(poolLPTokensAfter, poolLPTokensBefore);
        console.log(poolLPTokensSent);
        poolAddress.withdrawTokens(
            _inputData.from,
            poolLPTokensSent
        );

        logger.Log(
            address(this),
            msg.sender,
            "BalancerV2Withdraw",
            abi.encode(_inputData, tokenBalancesBefore, poolLPTokensSent)
        );
        console.log(poolLPTokensSent);
    }

    function _getPoolAddress(bytes32 poolId) internal pure returns (address) {
        // 12 byte logical shift left to remove the nonce and specialization setting. We don't need to mask,
        // since the logical shift already sets the upper bits to zero.
        return address(uint256(poolId) >> (12 * 8));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
