// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyFactory } from "../../contracts/interfaces/DS/IDSProxyFactory.sol";
import { IDSProxy } from "../../contracts/interfaces/DS/IDSProxy.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/protocols/safe/ISafeProxyFactory.sol";
import { ISafe } from "../../contracts/interfaces/protocols/safe/ISafe.sol";
import { IInstaIndex } from "../../contracts/interfaces/protocols/insta/IInstaIndex.sol";
import {
    IAccountImplementation
} from "../../contracts/interfaces/protocols/summerfi/IAccountImplementation.sol";
import { IAccountFactory } from "../../contracts/interfaces/protocols/summerfi/IAccountFactory.sol";
import { IInstaAccountV2 } from "../../contracts/interfaces/protocols/insta/IInstaAccountV2.sol";

import { BaseTest } from "./BaseTest.sol";
import { Addresses } from "../utils/Addresses.sol";
import { console2 as console } from "forge-std/console2.sol";

contract SmartWallet is BaseTest {
    address payable public owner;
    address payable public walletAddr;
    bool public isSafe;
    bool public isDSA;
    bool public isDSProxy;
    bool public isSFProxy;
    bool private safeInitialized;

    error SafeTxFailed();
    error UnsupportedWalletType();

    modifier ownerAsSender() {
        vm.startPrank(owner);
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

    function createDSProxy() public ownerAsSender returns (address payable) {
        walletAddr = payable(address(IDSProxyFactory(Addresses.DS_PROXY_FACTORY).build()));
        isSafe = false;
        isDSA = false;
        isDSProxy = true;
        isSFProxy = false;
        return walletAddr;
    }

    function createDSAProxy() public ownerAsSender returns (address payable) {
        walletAddr = payable(IInstaIndex(Addresses.INSTADAPP_INDEX).build(owner, 2, address(0)));
        isSafe = false;
        isDSA = true;
        isDSProxy = false;
        isSFProxy = false;
        return walletAddr;
    }

    function createSFProxy() public ownerAsSender returns (address payable) {
        walletAddr = payable(IAccountFactory(Addresses.SF_PROXY_FACTORY).createAccount());
        vm.label(address(Addresses.SF_PROXY_GUARD), "AccountGuard");
        isSafe = false;
        isDSA = false;
        isDSProxy = false;
        isSFProxy = true;
        return walletAddr;
    }

    function createSafe() public ownerAsSender returns (address payable) {
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

        walletAddr = payable(ISafeProxyFactory(Addresses.SAFE_PROXY_FACTORY)
                .createProxyWithNonce(Addresses.SAFE_SINGLETON, setupData, saltNonce));

        isSafe = true;
        safeInitialized = true;

        return walletAddr;
    }

    function execute(address _target, bytes memory _calldata, uint256 _value) public ownerAsSender {
        if (isSafe) {
            bytes memory signatures = bytes.concat(abi.encode(owner, bytes32(0)), bytes1(0x01));
            bool success = ISafe(walletAddr)
                .execTransaction(
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
        } else if (isDSProxy) {
            IDSProxy(walletAddr).execute{ value: _value }(_target, _calldata);
        } else if (isDSA) {
            string[] memory connectors = new string[](1);
            connectors[0] = "DEFI-SAVER-A";
            bytes[] memory connectorsData = new bytes[](1);
            connectorsData[0] = _calldata;

            IInstaAccountV2(walletAddr).cast{ value: _value }(connectors, connectorsData, owner);
        } else if (isSFProxy) {
            IAccountImplementation(walletAddr).execute{ value: _value }(_target, _calldata);
        } else {
            revert UnsupportedWalletType();
        }
    }

    function logExecute(address _target, bytes memory _calldata, uint256 _value) public {
        uint256 startGas = gasleft();
        execute(_target, _calldata, _value);
        uint256 gasUsed = startGas - gasleft();
        console.log("--------- EXECUTING TX FROM WALLET ----------");
        console.log("GAS USED: ", gasUsed);
    }

    function ownerApprove(address _token, uint256 _amount) public ownerAsSender {
        approve(_token, walletAddr, _amount);
    }
}
