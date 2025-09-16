// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineStake, SkyHelper} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineSelectFarm} from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";

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

    function executeSkyStakingEngineSelectFarm(
        address _stakingEngine,
        uint256 _index,
        address _farm,
        SkyStakingEngineOpen _open,
        SkyStakingEngineSelectFarm _cut,
        SmartWallet _wallet
    ) internal {
        executeSkyStakingEngineOpen(_stakingEngine, _open, _wallet);

        if (_farm == address(0)) return;

        bytes memory paramsCalldata = skyStakingEngineSelectFarmEncode(_stakingEngine, _index, _farm);
        bytes memory _calldata =
            abi.encodeWithSelector(SkyStakingEngineSelectFarm.executeActionDirect.selector, paramsCalldata);

        _wallet.execute(address(_cut), _calldata, 0);
    }

    function executeSkyStakingEngineStake(
        address _stakingEngine,
        uint256 _index,
        address _farm,
        uint256 _amount,
        address _from,
        SkyStakingEngineOpen _open,
        SkyStakingEngineSelectFarm _selectFarm,
        SkyStakingEngineStake _cut,
        SmartWallet _wallet
    ) internal {
        executeSkyStakingEngineSelectFarm(_stakingEngine, _index, _farm, _open, _selectFarm, _wallet);

        bytes memory paramsCalldata = skyStakingEngineStakeEncode(_stakingEngine, _index, _amount, _from);
        bytes memory _calldata =
            abi.encodeWithSelector(SkyStakingEngineStake.executeActionDirect.selector, paramsCalldata);

        _wallet.execute(address(_cut), _calldata, 0);
    }
}
