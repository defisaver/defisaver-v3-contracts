// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SkyStakingEngineOpen } from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import { SkyStakingEngineStake } from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {
    SkyStakingEngineUnstake
} from "../../../contracts/actions/sky/SkyStakingEngineUnstake.sol";
import {
    SkyStakingEngineClaimRewards
} from "../../../contracts/actions/sky/SkyStakingEngineClaimRewards.sol";
import {
    SkyStakingEngineSelectFarm
} from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";

library SkyStakingEncode {
    function open(address _stakingContract) public pure returns (bytes memory params) {
        params = abi.encode(SkyStakingEngineOpen.Params({ stakingContract: _stakingContract }));
    }

    function stake(address _stakingContract, uint256 _index, uint256 _amount, address _from)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            SkyStakingEngineStake.Params({
                stakingContract: _stakingContract, index: _index, amount: _amount, from: _from
            })
        );
    }

    function unstake(address _stakingContract, uint256 _index, uint256 _amount, address _to)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            SkyStakingEngineUnstake.Params({
                stakingContract: _stakingContract, index: _index, amount: _amount, to: _to
            })
        );
    }

    function claimRewards(address _stakingContract, uint256 _index, address _farm, address _to)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            SkyStakingEngineClaimRewards.Params({
                stakingContract: _stakingContract, index: _index, farm: _farm, to: _to
            })
        );
    }

    function selectFarm(address _stakingContract, uint256 _index, address _farm)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            SkyStakingEngineSelectFarm.Params({
                stakingContract: _stakingContract, index: _index, farm: _farm
            })
        );
    }
}
