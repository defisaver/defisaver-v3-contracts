// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/safe/ISafeProxyFactory.sol";
import "../interfaces/safe/ISafe.sol";


contract DFSSafeFactory {

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

    address public safeFactory;

    constructor(){
        if (block.chainid == 1){
            safeFactory = 0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2;
        } else if (block.chainid == 10){
            safeFactory = 0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC;
        } else if (block.chainid == 42161){
            safeFactory = 0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2;
        } else if (block.chainid == 8453){
            safeFactory = 0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC;
        }
    }

    function createSafeAndExecute(SafeCreationData memory _creationData, SafeExecutionData memory _executionData) public payable {
        address createdSafe = ISafeProxyFactory(safeFactory).createProxyWithNonce(
            _creationData.singleton,
            _creationData.initializer,
            _creationData.saltNonce
        );
        ISafe(createdSafe).execTransaction(
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