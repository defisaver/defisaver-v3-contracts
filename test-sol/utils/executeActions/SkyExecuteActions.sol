// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {SkyStakingEngine, SkyHelper} from "../../../contracts/actions/sky/SkyStakingEngine.sol";

import {ExecuteActionsBase} from "./ExecuteActionsBase.sol";
import {SmartWallet} from "../SmartWallet.sol";

contract SkyExecuteActions is ExecuteActionsBase {
    // TODO ->
    function _executeDirectSkyStakingEngine(
        address _stakingEngine,
        address _skyAddr,
        uint256 _amount,
        uint16 _index,
        address _sender,
        SkyStakingEngine _cut,
        SmartWallet _wallet
    ) internal {
        bytes memory paramsCalldata = skyStakingEngineEncode(_stakingEngine, _skyAddr, _amount, _index, _sender);
        // cut.
        bytes memory _calldata = abi.encodeWithSelector(SkyStakingEngine.executeActionDirect.selector, paramsCalldata);

        _wallet.execute(address(_cut), _calldata, 0);
    }
}
