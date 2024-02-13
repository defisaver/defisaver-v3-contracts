// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { BaseTest } from "./BaseTest.sol";
import { Config } from "../config/Config.sol";
import { Const } from "../Const.sol";

import { DSProxyFactoryInterface } from "../../contracts/DS/DSProxyFactoryInterface.sol";
import { DSProxy } from "../../contracts/DS/DSProxy.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/safe/ISafeProxyFactory.sol";
import { ISafe } from "../../contracts/interfaces/safe/ISafe.sol";

contract SmartWallet is Config, BaseTest {

    address payable internal walletAddr;
    bool private isSafe;

    error SafeTxFailed();

    function setUp() public override virtual {
        BaseTest.setUp();
        initConfig();
        isSmartWalletSafe() == true ? createSafe() : createDSProxy();
        vm.label(walletAddr, "SmartWallet");
    }

    function createDSProxy() internal bobAsSender() {
        walletAddr = payable(address(DSProxyFactoryInterface(Const.DS_PROXY_FACTORY).build()));
        isSafe = false;
    }

    function createSafe() internal bobAsSender() {
        uint256 saltNonce = block.timestamp;
        address[] memory owners = new address[](1);
        owners[0] = bob;

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
    }

    function executeByWallet(
        address _target,
        bytes memory _calldata,
        uint256 _value
    ) internal bobAsSender() {
        if (isSafe) {
            bytes memory signatures = bytes.concat(abi.encode(bob, bytes32(0)), bytes1(0x01));
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
}
