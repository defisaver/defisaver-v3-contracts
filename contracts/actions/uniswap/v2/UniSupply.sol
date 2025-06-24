// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";
import { UniV2Helper } from "./helpers/UniV2Helper.sol";

/// @title Supplies liquidity to uniswapV2
contract UniSupply is ActionBase, UniV2Helper {
    using TokenUtils for address;

    /// @param tokenA Address of the first token
    /// @param tokenB Address of the second token
    /// @param from Address to pull the tokens from
    /// @param to Address to send the liquidity tokens to
    /// @param amountADesired Amount of the first token to add
    /// @param amountBDesired Amount of the second token to add
    /// @param amountAMin Minimum amount of the first token to add
    /// @param amountBMin Minimum amount of the second token to add
    /// @param deadline Deadline of the transaction
    struct UniSupplyData {
        address tokenA;
        address tokenB;
        address from;
        address to;
        uint256 amountADesired;
        uint256 amountBDesired;
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
        UniSupplyData memory uniData = parseInputs(_callData);

        uniData.tokenA = _parseParamAddr(uniData.tokenA, _paramMapping[0], _subData, _returnValues);
        uniData.tokenB = _parseParamAddr(uniData.tokenB, _paramMapping[1], _subData, _returnValues);
        uniData.from = _parseParamAddr(uniData.from, _paramMapping[2], _subData, _returnValues);
        uniData.to = _parseParamAddr(uniData.to, _paramMapping[3], _subData, _returnValues);
        uniData.amountADesired = _parseParamUint(uniData.amountADesired, _paramMapping[4], _subData, _returnValues);
        uniData.amountBDesired = _parseParamUint(uniData.amountBDesired, _paramMapping[5], _subData, _returnValues);

        (uint256 liqAmount, bytes memory logData) = _uniSupply(uniData);
        emit ActionEvent("UniSupply", logData);
        return bytes32(liqAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        UniSupplyData memory uniData = parseInputs(_callData);
        (, bytes memory logData) = _uniSupply(uniData);
        logger.logActionDirectEvent("UniSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Adds liquidity to uniswap and sends lp tokens and returns to _to
    /// @dev Uni markets can move, so extra tokens are expected to be left and are send to _to
    /// @param _uniData All the required data to deposit to uni
    function _uniSupply(UniSupplyData memory _uniData) internal returns (uint256, bytes memory) {
        // fetch tokens from the address
        uint amountAPulled = _uniData.tokenA.pullTokensIfNeeded(_uniData.from, _uniData.amountADesired);
        uint amountBPulled = _uniData.tokenB.pullTokensIfNeeded(_uniData.from, _uniData.amountBDesired);

        // approve router so it can pull tokens
        _uniData.tokenA.approveToken(address(router), amountAPulled);
        _uniData.tokenB.approveToken(address(router), amountBPulled);

        _uniData.amountADesired = amountAPulled;
        _uniData.amountBDesired = amountBPulled;

        // add liq. and get info how much we put in
        (uint256 amountA, uint256 amountB, uint256 liqAmount) = _addLiquidity(_uniData);

        // send leftovers
        _uniData.tokenA.withdrawTokens(_uniData.from, _uniData.amountADesired - amountA);
        _uniData.tokenB.withdrawTokens(_uniData.from, _uniData.amountBDesired - amountB);

        bytes memory logData = abi.encode(_uniData, amountA, amountB, liqAmount);
        return (liqAmount, logData);
    }

    function _addLiquidity(UniSupplyData memory _uniData)
        internal
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liqAmount
        )
    {
        (amountA, amountB, liqAmount) = router.addLiquidity(
            _uniData.tokenA,
            _uniData.tokenB,
            _uniData.amountADesired,
            _uniData.amountBDesired,
            _uniData.amountAMin,
            _uniData.amountBMin,
            _uniData.to,
            _uniData.deadline
        );
    }

    function parseInputs(bytes memory _callData)
       public
        pure
        returns (UniSupplyData memory uniData)
    {
        uniData = abi.decode(_callData, (UniSupplyData));
    }
}
