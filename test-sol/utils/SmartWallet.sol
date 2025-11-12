// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyFactory } from "../../contracts/interfaces/DS/IDSProxyFactory.sol";
import { IDSProxy } from "../../contracts/interfaces/DS/IDSProxy.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/protocols/safe/ISafeProxyFactory.sol";
import { ISafe } from "../../contracts/interfaces/protocols/safe/ISafe.sol";
import { IInstaIndex } from "../../contracts/interfaces/protocols/insta/IInstaIndex.sol";
import { BaseTest } from "./BaseTest.sol";
import { Addresses } from "../utils/Addresses.sol";
import { DSAUtils } from "../../contracts/utils/DSAUtils.sol";
import { console2 } from "forge-std/console2.sol";

contract SmartWallet is BaseTest {
    address payable public owner;
    address payable public walletAddr;
    bool public isSafe;
    bool public isDSA;
    bool public isDSProxy;
    bool private safeInitialized;

    error SafeTxFailed();
    error UnsupportedWalletType();

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

    function createDSProxy() public ownerAsSender returns (address payable) {
        walletAddr = payable(address(IDSProxyFactory(Addresses.DS_PROXY_FACTORY).build()));
        isSafe = false;
        isDSA = false;
        isDSProxy = true;
        return walletAddr;
    }

    function createDSAProxy() public ownerAsSender returns (address payable) {
        walletAddr = payable(IInstaIndex(Addresses.INSTADAPP_INDEX).build(owner, 2, address(0)));
        isSafe = false;
        isDSA = true;
        isDSProxy = false;
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
        isDSA = false;
        isDSProxy = false;
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
            // Fix for [FAIL: vm.startPrank: cannot overwrite a prank until it is applied at least once]
            consumePrank();
            vm.startPrank(owner);

            DSAUtils.cast(walletAddr, Addresses.DFS_REGISTRY, owner, _calldata, _value);

            vm.stopPrank();
        } else {
            revert UnsupportedWalletType();
        }
    }

    function logExecute(address _target, bytes memory _calldata, uint256 _value) public {
        uint256 startGas = gasleft();
        execute(_target, _calldata, _value);
        uint256 gasUsed = startGas - gasleft();
        console2.log("--------- EXECUTING TX FROM WALLET ----------");
        console2.log("GAS USED: ", gasUsed);
    }

    function ownerApprove(address _token, uint256 _amount) public ownerAsSender {
        approve(_token, walletAddr, _amount);
    }
}
