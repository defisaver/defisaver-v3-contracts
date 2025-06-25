// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";
import { UniV2Helper } from "./helpers/UniV2Helper.sol";

/// @title Withdraws liquidity from uniswap V2
contract UniWithdraw is ActionBase, UniV2Helper {
    using TokenUtils for address;

    /// @param tokenA Address of the first token
    /// @param tokenB Address of the second token
    /// @param liquidity Amount of liquidity to withdraw
    /// @param to Address to send the withdrawn tokens to
    /// @param from Address to pull the tokens from
    /// @param amountAMin Minimum amount of the first token to withdraw
    /// @param amountBMin Minimum amount of the second token to withdraw
    /// @param deadline Deadline of the transaction
    struct UniWithdrawData {
        address tokenA;
        address tokenB;
        uint256 liquidity;
        address to;
        address from;
        uint256 amountAMin;
        uint256 amountBMin;
        uint256 deadline;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        UniWithdrawData memory uniData = parseInputs(_callData);

        uniData.tokenA = _parseParamAddr(uniData.tokenA, _paramMapping[0], _subData, _returnValues);
        uniData.tokenB = _parseParamAddr(uniData.tokenB, _paramMapping[1], _subData, _returnValues);
        uniData.liquidity = _parseParamUint(
            uniData.liquidity,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        uniData.to = _parseParamAddr(uniData.to, _paramMapping[3], _subData, _returnValues);
        uniData.from = _parseParamAddr(uniData.from, _paramMapping[4], _subData, _returnValues);

        (uint256 liqAmount, bytes memory logData) = _uniWithdraw(uniData);
        emit ActionEvent("UniWithdraw", logData);
        return bytes32(liqAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        UniWithdrawData memory uniData = parseInputs(_callData);
        (, bytes memory logData) = _uniWithdraw(uniData);
        logger.logActionDirectEvent("UniWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Removes liquidity from uniswap
    /// @param _uniData All the required data to withdraw from uni
    function _uniWithdraw(UniWithdrawData memory _uniData) internal returns (uint256, bytes memory) {
        address lpTokenAddr = factory.getPair(_uniData.tokenA, _uniData.tokenB);

        uint pulledTokens = lpTokenAddr.pullTokensIfNeeded(_uniData.from, _uniData.liquidity);
        lpTokenAddr.approveToken(address(router), pulledTokens);

        _uniData.liquidity = pulledTokens;

        // withdraw liq. and get info how much we got out
        (uint256 amountA, uint256 amountB) = _withdrawLiquidity(_uniData);

        bytes memory logData = abi.encode(_uniData, amountA, amountB);
        return (_uniData.liquidity, logData);
    }

    function _withdrawLiquidity(UniWithdrawData memory _uniData)
        internal
        returns (uint256 amountA, uint256 amountB)
    {
        (amountA, amountB) = router.removeLiquidity(
            _uniData.tokenA,
            _uniData.tokenB,
            _uniData.liquidity,
            _uniData.amountAMin,
            _uniData.amountBMin,
            _uniData.to,
            _uniData.deadline
        );
    }

    function parseInputs(bytes memory _callData)
       public
        pure
        returns (UniWithdrawData memory uniData)
    {
        uniData = abi.decode(_callData, (UniWithdrawData));
    }
}
