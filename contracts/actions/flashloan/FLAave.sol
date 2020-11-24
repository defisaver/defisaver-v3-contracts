// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../core/Subscriptions.sol";
import "../../interfaces/ILendingPool.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../core/StrategyData.sol";

contract FLAave is ActionBase, StrategyData {

    using SafeERC20 for IERC20;

    address
        public constant AAVE_LENDING_POOL_ADDRESSES = 0x398eC7346DcD622eDc5ae82352F02bE94C62d119;

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    ILendingPoolAddressesProvider public constant addressesProvider = ILendingPoolAddressesProvider(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        uint amount = abi.decode(_callData[0], (uint));
        address token = abi.decode(_callData[1], (address));
        uint8 flType = abi.decode(_callData[2], (uint8));

        amount = _parseParamUint(amount, _paramMapping[0], _subData, _returnValues);
        token = _parseParamAddr(token, _paramMapping[1], _subData, _returnValues);
        flType = uint8(_parseParamUint(flType, _paramMapping[2], _subData, _returnValues));

        address payable receiver = payable(registry.getAddr(keccak256("FLAave")));

        ILendingPool(AAVE_LENDING_POOL_ADDRESSES).flashLoan(receiver, token, amount, _callData[3]);

        logger.Log(address(this), msg.sender, "FLAave", abi.encode(amount, token, flType));

        return bytes32(amount);
    }

    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    ) external {

        (Task memory currTask, address proxy) = abi.decode(_params, (Task, address));

        sendTokens(_reserve, proxy, _amount);

        address payable taskExecutor = payable(registry.getAddr(keccak256("TaskExecutor")));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(
                CALLBACK_SELECTOR,
                currTask,
                bytes32(_amount + _fee)
            ));

        // return FL
        address payable aaveCore = addressesProvider.getLendingPoolCore();

        sendTokens(_reserve, aaveCore, (_amount + _fee));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    function parseParamData(bytes memory _data) public pure returns (uint amount,address token,uint8 flType) {
        (amount, token, flType) = abi.decode(_data,(uint256,address,uint8));
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
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

    receive() external virtual payable {}
}
