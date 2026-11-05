// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDSProxyFactory } from "../../contracts/interfaces/DS/IDSProxyFactory.sol";
import { IDSProxy } from "../../contracts/interfaces/DS/IDSProxy.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/protocols/safe/ISafeProxyFactory.sol";
import { ISafe } from "../../contracts/interfaces/protocols/safe/ISafe.sol";
import { SubProxy, StrategyModel } from "../../contracts/core/strategy/SubProxy.sol";
import { Addresses } from "./helpers/MainnetAddresses.sol";

abstract contract UserWallet {
    IDSProxy public proxy;
    address public proxyAddr;

    ISafe public safe;
    address public safeAddr;

    constructor() {
        createDSProxy();
        createSafe();
    }

    function createDSProxy() internal {
        proxy = IDSProxyFactory(Addresses.DS_PROXY_FACTORY).build();
        proxyAddr = address(proxy);
    }

    function createSafe() internal {
        uint256 saltNonce = block.timestamp;
        address[] memory owners = new address[](1);
        owners[0] = address(this);

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
        safeAddr = ISafeProxyFactory(Addresses.SAFE_PROXY_FACTORY)
            .createProxyWithNonce(Addresses.SAFE_SINGLETON, setupData, saltNonce);
        safe = ISafe(safeAddr);
    }

    function executeWithWallet(
        bool _isSafe,
        address _target,
        bytes memory _calldata,
        uint256 _value
    ) internal {
        bytes memory signatures = bytes.concat(abi.encode(address(this), bytes32(0)), bytes1(0x01));
        if (_isSafe) {
            bool success = safe.execTransaction(
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
            require(success, "Safe transaction failed");
        } else {
            proxy.execute(_target, _calldata);
        }
    }

    function subscribeToStrategy(
        bool _isSafe,
        address _subProxy,
        StrategyModel.StrategySub memory _sub
    ) public {
        bytes memory fnData = abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, _sub);
        executeWithWallet(_isSafe, _subProxy, fnData, 0);
    }
}
