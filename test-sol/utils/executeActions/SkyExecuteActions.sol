// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineStake, SkyHelper} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";

import {ExecuteActionsBase} from "./ExecuteActionsBase.sol";
import {SmartWallet} from "../SmartWallet.sol";

contract SkyExecuteActions is ExecuteActionsBase, SkyHelper {
    function executeSkyStakingEngineOpen(address _stakingEngine, SkyStakingEngineOpen _cut, SmartWallet _wallet)
        public
    {
        bytes memory paramsCalldata = skyStakingEngineOpenEncode(_stakingEngine);
        bytes memory _calldata =
            abi.encodeWithSelector(SkyStakingEngineOpen.executeActionDirect.selector, paramsCalldata);

        _wallet.execute(address(_cut), _calldata, 0);
    }

    function executeSkyStakingEngineStake(
        address _stakingEngine,
        address _skyAddr,
        uint256 _index,
        uint256 _amount,
        address _from,
        address _farm,
        SkyStakingEngineOpen _open,
        SkyStakingEngineStake _cut,
        SmartWallet _wallet
    ) internal {
        executeSkyStakingEngineOpen(_stakingEngine, _open, _wallet);

        bytes memory paramsCalldata =
            skyStakingEngineStakeEncode(_stakingEngine, _skyAddr, _index, _amount, _from, _farm);
        bytes memory _calldata =
            abi.encodeWithSelector(SkyStakingEngineStake.executeActionDirect.selector, paramsCalldata);

        _wallet.execute(address(_cut), _calldata, 0);
    }
}
