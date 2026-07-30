// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SkyStakingEngineOpen } from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {
    SkyStakingEngineStake,
    SkyHelper
} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {
    SkyStakingEngineSelectFarm
} from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";
import { SkyStake } from "../../../contracts/actions/sky/SkyStake.sol";

import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";
import { SkyStakingEncode } from "../encode/SkyStakingEncode.sol";

contract SkyExecuteActions is ExecuteActionsBase, SkyHelper {
    /// @dev StakingRewards contracts for direct USDS staking (SkyStake/SkyUnstake/SkyClaimRewards)
    address internal constant USDS_SKY_STAKING_REWARDS = 0x0650CAF159C5A49f711e8169D4336ECB9b950275;
    /// @dev points farm, no ERC20 rewards token
    address internal constant USDS_POINTS_STAKING_REWARDS =
        0x10ab606B067C9C461d8893c47C7512472E19e2Ce;
    address internal constant USDS_GROOVE_STAKING_REWARDS =
        0x4E41488C19cD35EB4de3083Fc3e204854c75c86a;

    function executeSkyStakingEngineOpen(
        address _stakingEngine,
        SkyStakingEngineOpen _cut,
        SmartWallet _wallet
    ) public {
        bytes memory paramsCalldata = SkyStakingEncode.open(_stakingEngine);
        bytes memory _calldata = abi.encodeWithSelector(
            SkyStakingEngineOpen.executeActionDirect.selector, paramsCalldata
        );

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

        bytes memory paramsCalldata = SkyStakingEncode.selectFarm(_stakingEngine, _index, _farm);
        bytes memory _calldata = abi.encodeWithSelector(
            SkyStakingEngineSelectFarm.executeActionDirect.selector, paramsCalldata
        );

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
        executeSkyStakingEngineSelectFarm(
            _stakingEngine, _index, _farm, _open, _selectFarm, _wallet
        );

        bytes memory paramsCalldata = SkyStakingEncode.stake(_stakingEngine, _index, _amount, _from);
        bytes memory _calldata = abi.encodeWithSelector(
            SkyStakingEngineStake.executeActionDirect.selector, paramsCalldata
        );

        _wallet.execute(address(_cut), _calldata, 0);
    }

    function executeSkyStake(
        address _stakingContract,
        address _stakingToken,
        uint256 _amount,
        address _from,
        SkyStake _cut,
        SmartWallet _wallet
    ) internal {
        bytes memory paramsCalldata = SkyStakingEncode.skyStake(
            _stakingContract, _stakingToken, _amount, _from
        );
        bytes memory _calldata =
            abi.encodeWithSelector(SkyStake.executeActionDirect.selector, paramsCalldata);

        _wallet.execute(address(_cut), _calldata, 0);
    }
}
