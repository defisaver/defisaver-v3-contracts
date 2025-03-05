/// @dev This contract is temporarily commented out so that `forge coverage` can pass.
/// See https://github.com/foundry-rs/foundry/issues/3357 for more context on coverage and stack to deep errors.
/// Compiling this with `forge build --optimize=false` will result in a "stack too deep" error.
/// Even though the source of this contract could be optimized, it will not be changed, as it can be compiled with optimization enabled.
/// NOTE This contract is not used in the production environment and is only left here for reference.
/*
// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { IUniswapV3NonfungiblePositionManager } from "../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";
import { IUniswapV3Factory } from "../interfaces/uniswap/v3/IUniswapV3Factory.sol";
import { IUniswapV3Pool } from "../interfaces/uniswap/v3/IUniswapV3Pool.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title Trigger contract that triggers if the current tick is outside of the positions range on the side that we want it to be
contract UniV3CurrentTickTrigger is ITrigger, AdminAuth, TriggerHelper {

    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER);
    IUniswapV3Factory public constant uniswapFactory = 
        IUniswapV3Factory(UNISWAP_V3_FACTORY);
    
    enum TickState {UNDER, OVER}

    /// @param tokenId id of the Uni V3 NFT that represents users LP position
    /// @param state represents if we want the current tick to be under or over the current positions tick range
    struct SubParams {
        uint256 tokenId;
        uint8 state;
    }
    /// @dev function that checks positions upper and lower tick, and current tick of the pool and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        (,, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper,,,,,) = positionManager.positions(triggerSubData.tokenId);

        IUniswapV3Pool pool = IUniswapV3Pool(uniswapFactory.getPool(token0, token1, fee));
        
        int24 currTick = pool.slot0().tick;

        if (TickState(triggerSubData.state) == TickState.UNDER){
            if (currTick < tickLower) return true;
        }
        if (TickState(triggerSubData.state) == TickState.OVER){
            if (currTick > tickUpper) return true;
        }

        return false;
    }
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
*/