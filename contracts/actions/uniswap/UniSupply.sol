// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/exchange/IUniswapRouter.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Supplies liquidity to uniswap
contract UniSupply is ActionBase, TokenUtils, GasBurner {

    IUniswapRouter public constant router = IUniswapRouter(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    struct UniSupplyData {
        address tokenA;
        address tokenB;
        address from;
        address to;
        uint amountADesired;
        uint amountBDesired;
        uint amountAMin;
        uint amountBMin;
        uint deadline;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        UniSupplyData memory uniData = parseInputs(_callData);

        // joinAddr = _parseParamAddr(joinAddr, _paramMapping[0], _subData, _returnValues);

        uint256 liqAmount = _uniSupply(uniData);

        return bytes32(liqAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        UniSupplyData memory uniData = parseInputs(_callData);

        _uniSupply(uniData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    

    function _uniSupply(UniSupplyData memory _uniData) internal returns (uint256 liqAmount) {

        pullTokens(_uniData.tokenA, _uniData.from, _uniData.amountADesired);
        pullTokens(_uniData.tokenB, _uniData.from, _uniData.amountBDesired);

        approveToken(_uniData.tokenA, address(router), uint(-1));
        approveToken(_uniData.tokenB, address(router), uint(-1));
        
        (, , liqAmount) = router.addLiquidityETH(
            _uniData.tokenA,
            _uniData.amountADesired,
            _uniData.amountAMin,
            _uniData.amountBMin,
            _uniData.to,
            _uniData.deadline
        );

        // send leftovers

    }

    function parseInputs(bytes[] memory _callData) internal pure returns 
    (
        UniSupplyData memory uniData
    
    ) {
        uniData.tokenA = abi.decode(_callData[0], (address));
        uniData.tokenB = abi.decode(_callData[1], (address));
        uniData.from = abi.decode(_callData[2], (address));
        uniData.to = abi.decode(_callData[3], (address));
        uniData.amountADesired = abi.decode(_callData[4], (uint256));
        uniData.amountBDesired = abi.decode(_callData[5], (uint256));
        uniData.amountAMin = abi.decode(_callData[6], (uint256));
        uniData.amountBMin = abi.decode(_callData[7], (uint256));
        uniData.deadline = abi.decode(_callData[8], (uint256));
    }
}
