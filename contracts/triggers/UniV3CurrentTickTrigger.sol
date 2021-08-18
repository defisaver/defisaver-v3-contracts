// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";
import "../interfaces/uniswap/v3/IUniswapV3Factory.sol";
import "../interfaces/uniswap/v3/IUniswapV3Pool.sol";

contract UniV3CurrentTickTrigger is ITrigger, AdminAuth {

    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);
    IUniswapV3Factory public constant uniswapFactory = 
        IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);
    
    enum WantedTickPosition {UNDER, OVER}

    struct SubParams {
        uint256 tokenId;
        uint8 state;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory inputData = parseInputs(_subData);

        (,, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper,,,,,) = positionManager.positions(inputData.tokenId);

        IUniswapV3Pool pool = IUniswapV3Pool(uniswapFactory.getPool(token0, token1, fee));
        
        int24 currTick = pool.slot0().tick;

        if (WantedTickPosition(inputData.state) == WantedTickPosition.UNDER){
            if (currTick < tickLower) return true;
        }
        if (WantedTickPosition(inputData.state) == WantedTickPosition.OVER){
            if (currTick > tickUpper) return true;
        }

        return false;
    }

    function parseInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}