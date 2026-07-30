// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    BytesTransientStorage
} from "../../../contracts/utils/transient/BytesTransientStorage.sol";
import { BaseTest } from "../BaseTest.sol";

contract TestBytesTransientStorage is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    BytesTransientStorage cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        cut = new BytesTransientStorage();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_roundTripsEdgeCaseByteLengths() public {
        _assertRoundTrip(32, keccak256("single full chunk"));
        _assertRoundTrip(33, keccak256("single full chunk plus one leftover byte"));
        _assertRoundTrip(63, keccak256("one byte short of two full chunks"));
        _assertRoundTrip(64, keccak256("two full chunks"));
        _assertRoundTrip(65, keccak256("two full chunks plus one leftover byte"));
        _assertRoundTrip(95, keccak256("one byte short of three full chunks"));
        _assertRoundTrip(96, keccak256("three full chunks"));
        _assertRoundTrip(127, keccak256("one byte short of four full chunks"));
        _assertRoundTrip(128, keccak256("four full chunks"));
        _assertRoundTrip(129, keccak256("four full chunks plus one leftover byte"));
    }

    function test_roundTripsLargerPayloads() public {
        _assertRoundTrip(608, keccak256("payload 1 rounded size"));
        _assertRoundTrip(3488, keccak256("payload 2 rounded size"));
        _assertRoundTrip(8191, keccak256("large payload with leftover"));
        _assertRoundTrip(8192, keccak256("large aligned payload"));
    }

    function test_overwritesLongerPayloadWithShorterPayload() public {
        bytes memory longPayload = _buildPseudoRandomBytes(4097, keccak256("long payload"));
        bytes memory shortPayload = _buildPseudoRandomBytes(33, keccak256("short payload"));

        cut.setBytesTransiently(longPayload);
        cut.setBytesTransiently(shortPayload);

        bytes memory result = cut.getBytesTransiently();

        assertEq(result.length, shortPayload.length);
        assertEq(keccak256(result), keccak256(shortPayload));
    }

    function testFuzz_roundTripsRandomPayload(uint16 _sizeSeed, bytes32 _seed) public {
        uint256 size = bound(uint256(_sizeSeed), 32, 8192);
        bytes memory payload = _buildPseudoRandomBytes(size, _seed);

        cut.setBytesTransiently(payload);
        bytes memory result = cut.getBytesTransiently();

        assertEq(result.length, payload.length);
        assertEq(keccak256(result), keccak256(payload));
    }

    function test_revertsForPayloadsShorterThanOneChunk() public {
        _assertSetReverts(0);
        _assertSetReverts(1);
        _assertSetReverts(31);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertRoundTrip(uint256 _size, bytes32 _seed) internal {
        bytes memory payload = _buildPseudoRandomBytes(_size, _seed);

        cut.setBytesTransiently(payload);
        bytes memory result = cut.getBytesTransiently();

        assertEq(result.length, payload.length);
        assertEq(keccak256(result), keccak256(payload));
    }

    function _assertSetReverts(uint256 _size) internal {
        bytes memory payload = new bytes(_size);

        vm.expectRevert();
        cut.setBytesTransiently(payload);
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
