// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { BaseTest } from "./BaseTest.sol";
import { Const } from "../Const.sol";

import { DSProxyFactoryInterface } from "../../contracts/DS/DSProxyFactoryInterface.sol";
import { DSProxy } from "../../contracts/DS/DSProxy.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/safe/ISafeProxyFactory.sol";
import { ISafe } from "../../contracts/interfaces/safe/ISafe.sol";

contract SmartWallet is BaseTest {

    address payable public owner;
    address payable public walletAddr;
    bool public isSafe;
    bool private safeInitialized;

    error SafeTxFailed();

    modifier ownerAsSender() {
        vm.prank(owner);
        _;
        vm.stopPrank();
    }

    constructor(address _owner) {
        setUp(_owner);
    }

    function setUp(address _owner) public {
        owner = payable(_owner);
        vm.label(owner, "owner");

        BaseTest.setUp();
        isSmartWalletSafe() == true ? createSafe() : createDSProxy();
        vm.label(walletAddr, "SmartWallet");
    }

    function createDSProxy() public ownerAsSender() returns(address payable) {
        walletAddr = payable(address(DSProxyFactoryInterface(Const.DS_PROXY_FACTORY).build()));
        isSafe = false;
        return walletAddr;
    }

    function createSafe() public ownerAsSender() returns(address payable) {
        if (safeInitialized) return walletAddr;

        uint256 saltNonce = block.timestamp;
        address[] memory owners = new address[](1);
        owners[0] = owner;

        bytes memory setupData = abi.encodeWithSelector(
            ISafe.setup.selector,
            owners,
            1,
            address(0),
            bytes(""),
            address(0),
            address(0),
            0,
            payable(address(0))
        );

        walletAddr = payable(ISafeProxyFactory(Const.SAFE_PROXY_FACTORY).createProxyWithNonce(
            Const.SAFE_SINGLETON,
            setupData,
            saltNonce
        ));

        isSafe = true;
        safeInitialized = true;

        return walletAddr;
    }

    function execute(
        address _target,
        bytes memory _calldata,
        uint256 _value
    ) public ownerAsSender() {
        if (isSafe) {
            bytes memory signatures = bytes.concat(abi.encode(owner, bytes32(0)), bytes1(0x01));
            bool success = ISafe(walletAddr).execTransaction(
                _target, // to
                _value, // eth value
                _calldata, // action calldata
                ISafe.Operation.DelegateCall, // operation
                0, // safeTxGas
                0, // baseGas
                0, // gasPrice
                address(0), // gasToken
                payable(0), // refundReceiver
                signatures // packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
            );
            if (!success) {
                revert SafeTxFailed();
            }
        } else {
            DSProxy(walletAddr).execute(_target, _calldata);
        }
    }

    function ownerApprove(address _token, uint256 _amount) public ownerAsSender() {
        approve(_token, walletAddr, _amount);
    }
}
