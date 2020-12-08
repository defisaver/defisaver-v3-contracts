// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../core/Subscriptions.sol";
import "../../interfaces/ILendingPool.sol";
import "../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../core/StrategyData.sol";

contract FLAaveV2 is ActionBase, StrategyData {

    using SafeERC20 for IERC20;

    address
        public constant AAVE_LENDING_POOL_ADDRESSES = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;

    ILendingPoolAddressesProviderV2
        public constant addressesProvider = ILendingPoolAddressesProviderV2(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    struct FLAaveV2Data {
        address receiver;
        address[] tokens;
        uint[] amounts;
        uint[] modes;
        address onBehalfOf;
        bytes params;
        uint16 refferalCode;
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FLAaveV2Data memory flData = parseParamData(_callData);

        callFl(flData, _callData[4]);

        logger.Log(address(this), msg.sender, "FLAaveV2", abi.encode(
            flData.tokens,
            flData.amounts,
            flData.modes,
            flData.onBehalfOf
        ));

        return bytes32(flData.amounts[0]);
    }

    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory _fees,
        address,
        bytes memory _params
    ) public returns (bool) {

        (Task memory currTask, address proxy) = abi.decode(_params, (Task, address));

        for (uint i = 0; i < _assets.length; ++i) {
            sendTokens(_assets[i], proxy, _amounts[i]);
        }

        address payable taskExecutor = payable(registry.getAddr(keccak256("TaskExecutor")));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(
                CALLBACK_SELECTOR,
                currTask,
                bytes32(_amounts[0] + _fees[0])
            )
        );

        // return FL
        for (uint i = 0; i < _assets.length; i++) {
            IERC20(_assets[i]).approve(address(AAVE_LENDING_POOL_ADDRESSES), _amounts[i] + _fees[i]);
        }

        return true;
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    function parseParamData(bytes[] memory _callData) public view returns (FLAaveV2Data memory flData) {
        flData.amounts = abi.decode(_callData[0], (uint[]));
        flData.tokens = abi.decode(_callData[1], (address[]));
        flData.modes = abi.decode(_callData[2], (uint[]));
        flData.onBehalfOf = abi.decode(_callData[3], (address));
        flData.receiver = payable(registry.getAddr(keccak256("FLAaveV2")));
    }

    function callFl(FLAaveV2Data memory _flData, bytes memory _params) internal {
        ILendingPoolV2(AAVE_LENDING_POOL_ADDRESSES).flashLoan(
            _flData.receiver,
            _flData.tokens,
            _flData.amounts,
            _flData.modes,
            _flData.onBehalfOf,
            _params,
            AAVE_REFERRAL_CODE
        );

    }

    function sendTokens(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        if (_token != ETH_ADDRESS) {
            IERC20(_token).safeTransfer(_to, _amount);
        } else {
            payable(_to).transfer(_amount);
        }
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external virtual payable {}
}
