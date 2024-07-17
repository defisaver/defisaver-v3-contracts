// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ISafeProxyFactory } from "../interfaces/safe/ISafeProxyFactory.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";

/// @title Helper contract for deploying a new Safe and executing a Safe tx all at once
/// @dev We didn't use Safe's initializer for this since we want the Safe address to be easily recreatable on each chain
contract DFSSafeFactory {
    error UnsupportedChain(uint256);

    struct SafeCreationData {
        address singleton;
        bytes initializer;
        uint256 saltNonce;
    }

    struct SafeExecutionData {
        address to;
        uint256 value;
        bytes data;
        uint8 operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        bytes signatures;
    }

    ISafeProxyFactory public safeFactory;

    constructor(){
        uint256 chainId = block.chainid;

        if (chainId == 1){
            safeFactory = ISafeProxyFactory(0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2);
        } else if (chainId == 10){
            safeFactory = ISafeProxyFactory(0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC);
        } else if (chainId == 42161){
            safeFactory = ISafeProxyFactory(0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2);
        } else if (chainId == 8453){
            safeFactory = ISafeProxyFactory(0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC);
        } else {
            revert UnsupportedChain(chainId);
        }
    }

    function createSafeAndExecute(SafeCreationData memory _creationData, SafeExecutionData memory _executionData) public payable {
        ISafe createdSafe = ISafe(safeFactory.createProxyWithNonce(
            _creationData.singleton,
            _creationData.initializer,
            _creationData.saltNonce
        ));
        createdSafe.execTransaction{value: msg.value}(
            _executionData.to,
            _executionData.value,
            _executionData.data,
            ISafe.Operation(_executionData.operation),
            _executionData.safeTxGas,
            _executionData.baseGas,
            _executionData.gasPrice,
            _executionData.gasToken,
            _executionData.refundReceiver,
            _executionData.signatures
        );
    }
}