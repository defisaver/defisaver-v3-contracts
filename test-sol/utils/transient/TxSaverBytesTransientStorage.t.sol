// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    TxSaverBytesTransientStorage
} from "../../../contracts/tx-saver/TxSaverBytesTransientStorage.sol";
import { BaseTest } from "../BaseTest.sol";

contract TxSaverBytesTransientStorageHarness is TxSaverBytesTransientStorage {
    function setAndGet(bytes memory _data, bool _takeFeeFromPosition)
        external
        returns (bytes memory result, uint256 feeType)
    {
        setBytesTransiently(_data, _takeFeeFromPosition);

        result = getBytesTransiently();
        feeType = getFeeType();
    }

    function exposedSetBytesTransiently(bytes memory _data, bool _takeFeeFromPosition) external {
        setBytesTransiently(_data, _takeFeeFromPosition);
    }
}

contract TestTxSaverBytesTransientStorage is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    TxSaverBytesTransientStorageHarness cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 constant POSITION_FEE_FLAG = 1;
    uint256 constant EOA_OR_WALLET_FEE_FLAG = 2;
    uint256 constant CHUNK_SIZE = 32;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        cut = new TxSaverBytesTransientStorageHarness();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_roundTripsEdgeCaseAlignedByteLengths() public {
        _assertRoundTrip(CHUNK_SIZE, true, keccak256("single chunk position fee"));
        _assertRoundTrip(CHUNK_SIZE, false, keccak256("single chunk eoa fee"));
        _assertRoundTrip(CHUNK_SIZE * 2, true, keccak256("two chunks position fee"));
        _assertRoundTrip(CHUNK_SIZE * 3, false, keccak256("three chunks eoa fee"));
        _assertRoundTrip(CHUNK_SIZE * 4, true, keccak256("four chunks position fee"));
    }

    function test_roundTripsLargerAlignedPayloads() public {
        _assertRoundTrip(CHUNK_SIZE * 19, true, keccak256("payload 1 rounded size"));
        _assertRoundTrip(CHUNK_SIZE * 109, false, keccak256("payload 2 rounded size"));
        _assertRoundTrip(CHUNK_SIZE * 256, true, keccak256("large aligned payload"));
        _assertRoundTrip(CHUNK_SIZE * 384, false, keccak256("larger aligned payload"));
    }

    function test_overwritesLongerPayloadWithShorterPayload() public {
        bytes memory longPayload =
            _buildPseudoRandomBytes(CHUNK_SIZE * 128, keccak256("long payload"));
        bytes memory shortPayload = _buildPseudoRandomBytes(CHUNK_SIZE, keccak256("short payload"));

        cut.exposedSetBytesTransiently(longPayload, true);

        (bytes memory result, uint256 feeType) = cut.setAndGet(shortPayload, false);

        assertEq(result.length, shortPayload.length);
        assertEq(keccak256(result), keccak256(shortPayload));
        assertEq(feeType, EOA_OR_WALLET_FEE_FLAG);
    }

    function testFuzz_roundTripsRandomAlignedPayload(
        uint16 _chunksSeed,
        bool _takeFeeFromPosition,
        bytes32 _seed
    ) public {
        uint256 chunks = bound(uint256(_chunksSeed), 1, 256);
        bytes memory payload = _buildPseudoRandomBytes(chunks * CHUNK_SIZE, _seed);

        (bytes memory result, uint256 feeType) = cut.setAndGet(payload, _takeFeeFromPosition);

        assertEq(result.length, payload.length);
        assertEq(keccak256(result), keccak256(payload));
        assertEq(feeType, _takeFeeFromPosition ? POSITION_FEE_FLAG : EOA_OR_WALLET_FEE_FLAG);
    }

    function test_revertsForEmptyPayload() public {
        _assertSetReverts(0);
    }

    function test_revertsForUnalignedPayloads() public {
        _assertSetReverts(1);
        _assertSetReverts(31);
        _assertSetReverts(33);
        _assertSetReverts(63);
        _assertSetReverts(65);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertRoundTrip(uint256 _size, bool _takeFeeFromPosition, bytes32 _seed) internal {
        bytes memory payload = _buildPseudoRandomBytes(_size, _seed);

        (bytes memory result, uint256 feeType) = cut.setAndGet(payload, _takeFeeFromPosition);

        assertEq(result.length, payload.length);
        assertEq(keccak256(result), keccak256(payload));
        assertEq(feeType, _takeFeeFromPosition ? POSITION_FEE_FLAG : EOA_OR_WALLET_FEE_FLAG);
    }

    function _assertSetReverts(uint256 _size) internal {
        bytes memory payload = new bytes(_size);

        vm.expectRevert();
        cut.exposedSetBytesTransiently(payload, true);
    }

    function _buildPseudoRandomBytes(uint256 _size, bytes32 _seed)
        internal
        pure
        returns (bytes memory payload)
    {
        payload = new bytes(_size);

        for (uint256 i = 0; i < _size; ++i) {
            payload[i] = bytes1(uint8(uint256(keccak256(abi.encode(_seed, i)))));
        }
    }
}
