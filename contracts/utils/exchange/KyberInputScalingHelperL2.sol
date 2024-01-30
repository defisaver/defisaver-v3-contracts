// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/IERC20.sol";
import "../../interfaces/kyber/IAggregationExecutorOptimistic.sol";
import "../../interfaces/kyber/IMetaAggregationRouterV2.sol";

library Common {
  using CalldataReader for bytes;

  function _readPool(bytes memory data, uint256 startByte) internal pure returns (address, uint256) {
    uint24 poolId;
    address poolAddress;
    (poolId, startByte) = data._readUint24(startByte);
    if (poolId == 0) {
      (poolAddress, startByte) = data._readAddress(startByte);
    }
    return (poolAddress, startByte);
  }

  function _readRecipient(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (address, uint256) {
    uint8 recipientFlag;
    address recipient;
    (recipientFlag, startByte) = data._readUint8(startByte);
    if (recipientFlag != 2 && recipientFlag != 1) {
      (recipient, startByte) = data._readAddress(startByte);
    }
    return (recipient, startByte);
  }

  function _readBytes32Array(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (bytes32[] memory bytesArray, uint256) {
    bytes memory ret;
    (ret, startByte) = data._calldataVal(startByte, 1);
    uint256 length = uint256(uint8(bytes1(ret)));
    bytesArray = new bytes32[](length);
    for (uint8 i = 0; i < length; ++i) {
      (bytesArray[i], startByte) = data._readBytes32(startByte);
    }
    return (bytesArray, startByte);
  }
}

library BytesHelper {
  function write16Bytes(
    bytes memory original,
    uint256 index,
    bytes16 value
  ) internal pure returns (bytes memory) {
    assembly {
      let offset := add(original, add(index, 32))
      let val := mload(offset) // read 32 bytes [index : index + 32]
      val := and(val, not(0xffffffffffffffffffffffffffffffff00000000000000000000000000000000)) // clear [index : index + 16]
      val := or(val, value) // set 16 bytes to val above
      mstore(offset, val) // store to [index : index + 32]
    }
    return original;
  }

  function write16Bytes(
    bytes memory original,
    uint256 index,
    uint128 value
  ) internal pure returns (bytes memory) {
    return write16Bytes(original, index, bytes16(value));
  }

  function write16Bytes(
    bytes memory original,
    uint256 index,
    uint256 value,
    string memory errorMsg
  ) internal pure returns (bytes memory) {
    require(
      value <= type(uint128).max,
      string(abi.encodePacked(errorMsg, "/Exceed compressed type range"))
    );
    return write16Bytes(original, index, uint128(value));
  }
}

/// @title DexScaler
/// @notice Contain functions to scale DEX structs
/// @dev For this repo"s scope, we only care about swap amounts, so we just need to decode until we get swap amounts
library DexScaler {
  using BytesHelper for bytes;
  using CalldataReader for bytes;
  using Common for bytes;

  function scaleUniSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    // decode
    (, startByte) = data._readPool(startByte);
    (, startByte) = data._readRecipient(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleUniSwap"
    );
  }

  function scaleStableSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    (, startByte) = data._readPool(startByte);
    (, startByte) = data._readUint8(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleStableSwap"
    );
  }

  function scaleCurveSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    bool canGetIndex;
    (canGetIndex, startByte) = data._readBool(0);
    (, startByte) = data._readPool(startByte);
    if (!canGetIndex) {
      (, startByte) = data._readAddress(startByte);
      (, startByte) = data._readUint8(startByte);
    }
    (, startByte) = data._readUint8(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleCurveSwap"
    );
  }

  function scaleUniswapV3KSElastic(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    (, startByte) = data._readRecipient(startByte);
    (, startByte) = data._readPool(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte,
      oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount,
      "scaleUniswapV3KSElastic"
    );
  }

  function scaleBalancerV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    (, startByte) = data._readPool(startByte);
    (, startByte) = data._readBytes32(startByte);
    (, startByte) = data._readUint8(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleBalancerV2"
    );
  }

  function scaleDODO(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    (, startByte) = data._readRecipient(startByte);
    (, startByte) = data._readPool(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleDODO"
    );
  }

  function scaleGMX(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;
    // decode
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleGMX"
    );
  }

  function scaleSynthetix(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);
    (, startByte) = data._readBytes32(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleSynthetix"
    );
  }

  function scaleWrappedstETH(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readPool(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleWrappedstETH"
    );
  }

  function scaleStETH(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    (uint256 swapAmount,) = data._readUint128AsUint256(0);
    return
      data.write16Bytes(0, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleStETH");
  }

  function scalePlatypus(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);

    (, startByte) = data._readRecipient(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scalePlatypus"
    );
  }

  function scalePSM(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);

    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scalePSM"
    );
  }

  function scaleMaverick(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);

    (, startByte) = data._readRecipient(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleMaverick"
    );
  }

  function scaleSyncSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readBytes(startByte);
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleSyncSwap"
    );
  }

  function scaleAlgebraV1(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readRecipient(startByte);

    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readAddress(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);

    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleAlgebraV1"
    );
  }

  function scaleBalancerBatch(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // decode
    (, startByte) = data._readPool(startByte);

    (, startByte) = data._readBytes32Array(startByte);
    (, startByte) = data._readAddressArray(startByte);
    (, startByte) = data._readBytesArray(startByte);

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte);
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleBalancerBatch"
    );
  }

  function scaleMantis(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readPool(startByte); // pool

    (, startByte) = data._readAddress(startByte); // tokenOut

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte); // amount
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleMantis"
    );
  }

  function scaleIziSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readPool(startByte); // pool
    (, startByte) = data._readAddress(startByte); // tokenOut
    // recipient
    (, startByte) = data._readRecipient(startByte);
    (uint256 swapAmount,) = data._readUint128AsUint256(startByte); // amount
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleIziSwap"
    );
  }

  function scaleTraderJoeV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    // recipient
    (, startByte) = data._readRecipient(startByte);

    (, startByte) = data._readPool(startByte); // pool

    (, startByte) = data._readAddress(startByte); // tokenOut

    (, startByte) = data._readBool(startByte); // isV2

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte); // amount
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleTraderJoeV2"
    );
  }

  function scaleLevelFiV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readPool(startByte); // pool

    (, startByte) = data._readAddress(startByte); // tokenOut

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte); // amount
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleLevelFiV2"
    );
  }

  function scaleGMXGLP(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readPool(startByte); // pool

    (, startByte) = data._readAddress(startByte); // yearnVault

    uint8 directionFlag;
    (directionFlag, startByte) = data._readUint8(startByte);
    if (directionFlag == 1) (, startByte) = data._readAddress(startByte); // tokenOut

    (uint256 swapAmount,) = data._readUint128AsUint256(startByte); // amount
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (swapAmount * newAmount) / oldAmount, "scaleGMXGLP"
    );
  }

  function scaleVooi(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readPool(startByte); // pool

    (, startByte) = data._readUint8(startByte); // toId

    (uint256 fromAmount,) = data._readUint128AsUint256(startByte); // amount

    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (fromAmount * newAmount) / oldAmount, "scaleVooi"
    );
  }

  function scaleVelocoreV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    uint256 startByte;

    (, startByte) = data._readPool(startByte); // pool

    (, startByte) = data._readAddress(startByte); // tokenOut

    (uint256 amount,) = data._readUint128AsUint256(startByte); // amount
    return data.write16Bytes(
      startByte, oldAmount == 0 ? 0 : (amount * newAmount) / oldAmount, "scaleVelocoreV2"
    );
  }
}

library ScalingDataL2Lib {
  using DexScaler for bytes;

  function newUniSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleUniSwap(oldAmount, newAmount);
  }

  function newStableSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleStableSwap(oldAmount, newAmount);
  }

  function newCurveSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleCurveSwap(oldAmount, newAmount);
  }

  function newKyberDMM(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleUniSwap(oldAmount, newAmount);
  }

  function newUniswapV3KSElastic(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleUniswapV3KSElastic(oldAmount, newAmount);
  }

  function newBalancerV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleBalancerV2(oldAmount, newAmount);
  }

  function newDODO(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleDODO(oldAmount, newAmount);
  }

  function newVelodrome(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleUniSwap(oldAmount, newAmount);
  }

  function newGMX(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleGMX(oldAmount, newAmount);
  }

  function newSynthetix(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleSynthetix(oldAmount, newAmount);
  }

  function newCamelot(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleUniSwap(oldAmount, newAmount);
  }

  function newPlatypus(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scalePlatypus(oldAmount, newAmount);
  }

  function newWrappedstETHSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleWrappedstETH(oldAmount, newAmount);
  }

  function newPSM(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scalePSM(oldAmount, newAmount);
  }

  function newFrax(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleUniSwap(oldAmount, newAmount);
  }

  function newStETHSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleStETH(oldAmount, newAmount);
  }

  function newMaverick(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleMaverick(oldAmount, newAmount);
  }

  function newSyncSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleSyncSwap(oldAmount, newAmount);
  }

  function newAlgebraV1(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleAlgebraV1(oldAmount, newAmount);
  }

  function newBalancerBatch(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleBalancerBatch(oldAmount, newAmount);
  }

  function newMantis(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleMantis(oldAmount, newAmount);
  }

  function newIziSwap(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleIziSwap(oldAmount, newAmount);
  }

  function newTraderJoeV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleTraderJoeV2(oldAmount, newAmount);
  }

  function newLevelFiV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleLevelFiV2(oldAmount, newAmount);
  }

  function newGMXGLP(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleGMXGLP(oldAmount, newAmount);
  }

  function newVooi(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleVooi(oldAmount, newAmount);
  }

  function newVelocoreV2(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    return data.scaleVelocoreV2(oldAmount, newAmount);
  }
}

library CalldataReader {
  /// @notice read the bytes value of data from a starting position and length
  /// @param data bytes array of data
  /// @param startByte starting position to read
  /// @param length length from starting position
  /// @return retVal value of the bytes
  /// @return (the next position to read from)
  function _calldataVal(
    bytes memory data,
    uint256 startByte,
    uint256 length
  ) internal pure returns (bytes memory retVal, uint256) {
    require(length + startByte <= data.length, "calldataVal trying to read beyond data size");
    uint256 loops = (length + 31) / 32;
    assembly {
      let m := mload(0x40)
      mstore(m, length)
      for { let i := 0 } lt(i, loops) { i := add(1, i) } {
        mstore(add(m, mul(32, add(1, i))), mload(add(data, add(mul(32, add(1, i)), startByte))))
      }
      mstore(0x40, add(m, add(32, length)))
      retVal := m
    }
    return (retVal, length + startByte);
  }

  function _readBool(bytes memory data, uint256 startByte) internal pure returns (bool, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 1);
    return (bytes1(ret) > 0, startByte);
  }

  function _readUint8(bytes memory data, uint256 startByte) internal pure returns (uint8, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 1);
    return (uint8(bytes1(ret)), startByte);
  }

  function _readUint24(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (uint24, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 3);
    return (uint24(bytes3(ret)), startByte);
  }

  function _readUint32(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (uint32, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 4);
    return (uint32(bytes4(ret)), startByte);
  }

  function _readUint160(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (uint160, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 20);
    return (uint160(bytes20(ret)), startByte);
  }

  /// @dev only when sure that the value of uint256 never exceed uint128
  function _readUint128AsUint256(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (uint256, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 16);
    return (uint256(uint128(bytes16(ret))), startByte);
  }

  function _readAddress(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (address, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 20);

    return (address(bytes20(ret)), startByte);
  }

  function _readBytes1(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (bytes1, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 1);
    return (bytes1(ret), startByte);
  }

  function _readBytes4(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (bytes4, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 4);
    return (bytes4(ret), startByte);
  }

  function _readBytes32(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (bytes32, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 32);
    return (bytes32(ret), startByte);
  }

  /// @dev length of bytes is currently limited to uint32
  function _readBytes(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (bytes memory b, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 4);
    uint256 length = uint256(uint32(bytes4(ret)));
    (b, startByte) = _calldataVal(data, startByte, length);
    return (b, startByte);
  }

  /// @dev length of bytes array is currently limited to uint8
  function _readBytesArray(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (bytes[] memory bytesArray, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 1);
    uint256 length = uint256(uint8(bytes1(ret)));
    bytesArray = new bytes[](length);
    for (uint8 i = 0; i < length; ++i) {
      (bytesArray[i], startByte) = _readBytes(data, startByte);
    }
    return (bytesArray, startByte);
  }

  /// @dev length of address array is currently limited to uint8 to save bytes
  function _readAddressArray(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (address[] memory addrs, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 1);
    uint256 length = uint256(uint8(bytes1(ret)));
    addrs = new address[](length);
    for (uint8 i = 0; i < length; ++i) {
      (addrs[i], startByte) = _readAddress(data, startByte);
    }
    return (addrs, startByte);
  }

  /// @dev length of uint array is currently limited to uint8 to save bytes
  /// @dev same as _readUint128AsUint256, only use when sure that value never exceed uint128
  function _readUint128ArrayAsUint256Array(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (uint256[] memory, uint256) {
    bytes memory ret;
    (ret, startByte) = _calldataVal(data, startByte, 1);
    uint256 length = uint256(uint8(bytes1(ret)));
    uint256[] memory us = new uint256[](length);
    for (uint8 i = 0; i < length; ++i) {
      (us[i], startByte) = _readUint128AsUint256(data, startByte);
    }
    return (us, startByte);
  }
}

library ExecutorReader {
  function readSwapExecutorDescription(bytes memory data) internal pure returns (bytes memory) {
    uint256 startByte = 0;
    IAggregationExecutorOptimistic.SwapExecutorDescription memory desc;

    // Swap array
    bytes memory ret;
    (ret, startByte) = CalldataReader._calldataVal(data, startByte, 1);
    uint256 lX = uint256(uint8(bytes1(ret)));
    desc.swapSequences = new IAggregationExecutorOptimistic.Swap[][](lX);
    for (uint8 i = 0; i < lX; ++i) {
      (ret, startByte) = CalldataReader._calldataVal(data, startByte, 1);
      uint256 lY = uint256(uint8(bytes1(ret)));
      desc.swapSequences[i] = new IAggregationExecutorOptimistic.Swap[](lY);
      for (uint8 j = 0; j < lY; ++j) {
        (desc.swapSequences[i][j], startByte) = _readSwap(data, startByte);
      }
    }

    // basic members
    (desc.tokenIn, startByte) = CalldataReader._readAddress(data, startByte);
    (desc.tokenOut, startByte) = CalldataReader._readAddress(data, startByte);
    (desc.to, startByte) = CalldataReader._readAddress(data, startByte);
    (desc.deadline, startByte) = CalldataReader._readUint128AsUint256(data, startByte);
    (desc.positiveSlippageData, startByte) = CalldataReader._readBytes(data, startByte);

    return abi.encode(desc);
  }

  function readSwapSingleSequence(bytes memory data)
    internal
    pure
    returns (IAggregationExecutorOptimistic.Swap[] memory swaps, address tokenIn)
  {
    uint256 startByte = 0;
    bytes memory ret;
    (ret, startByte) = CalldataReader._calldataVal(data, startByte, 1);
    uint256 len = uint256(uint8(bytes1(ret)));
    swaps = new IAggregationExecutorOptimistic.Swap[](len);
    for (uint8 i = 0; i < len; ++i) {
      (swaps[i], startByte) = _readSwap(data, startByte);
    }
    (tokenIn, startByte) = CalldataReader._readAddress(data, startByte);
  }

  function _readSwap(
    bytes memory data,
    uint256 startByte
  ) internal pure returns (IAggregationExecutorOptimistic.Swap memory swap, uint256) {
    (swap.data, startByte) = CalldataReader._readBytes(data, startByte);
    bytes1 t;
    (t, startByte) = CalldataReader._readBytes1(data, startByte);
    swap.functionSelector = bytes4(uint32(uint8(t)));
    return (swap, startByte);
  }
}

contract CalldataWriter {
  function writeSimpleSwapData(IMetaAggregationRouterV2.SimpleSwapData memory simpleSwapData)
    internal
    pure
    returns (bytes memory shortData)
  {
    shortData = bytes.concat(shortData, _writeAddressArray(simpleSwapData.firstPools));
    shortData =
      bytes.concat(shortData, _writeUint256ArrayAsUint128Array(simpleSwapData.firstSwapAmounts));
    shortData = bytes.concat(shortData, _writeBytesArray(simpleSwapData.swapDatas));
    shortData = bytes.concat(shortData, bytes16(uint128(simpleSwapData.deadline)));
    shortData = bytes.concat(shortData, _writeBytes(simpleSwapData.positiveSlippageData));
  }

  /*
   ************************ AggregationExecutor ************************
   */
  function writeSwapExecutorDescription(IAggregationExecutorOptimistic.SwapExecutorDescription memory desc)
    internal
    pure
    returns (bytes memory shortData)
  {
    // write Swap array
    uint8 lX = uint8(desc.swapSequences.length);
    shortData = bytes.concat(shortData, bytes1(lX));
    for (uint8 i = 0; i < lX; ++i) {
      uint8 lY = uint8(desc.swapSequences[i].length);
      shortData = bytes.concat(shortData, bytes1(lY));
      for (uint8 j = 0; j < lY; ++j) {
        shortData = bytes.concat(shortData, _writeSwap(desc.swapSequences[i][j]));
      }
    }

    // basic members
    shortData = bytes.concat(shortData, bytes20(desc.tokenIn));
    shortData = bytes.concat(shortData, bytes20(desc.tokenOut));
    shortData = bytes.concat(shortData, bytes20(desc.to));
    shortData = bytes.concat(shortData, bytes16(uint128(desc.deadline)));
    shortData = bytes.concat(shortData, _writeBytes(desc.positiveSlippageData));
  }

  function writeSimpleModeSwapDatas(
    bytes[] memory swapDatas,
    address tokenIn
  ) internal pure returns (bytes[] memory shortData) {
    uint8 len = uint8(swapDatas.length);
    for (uint8 i = 0; i < len; ++i) {
      swapDatas[i] = _writeSwapSingleSequence(swapDatas[i], tokenIn);
    }
    return (swapDatas);
  }

  function _writeSwapSingleSequence(
    bytes memory data,
    address tokenIn
  ) internal pure returns (bytes memory shortData) {
    IAggregationExecutorOptimistic.Swap[] memory swaps = abi.decode(data, (IAggregationExecutorOptimistic.Swap[]));

    uint8 len = uint8(swaps.length);
    shortData = bytes.concat(shortData, bytes1(len));
    for (uint8 i = 0; i < len; ++i) {
      shortData = bytes.concat(shortData, _writeSwap(swaps[i]));
    }
    shortData = bytes.concat(shortData, bytes20(tokenIn));
  }

  function _writeAddressArray(address[] memory addrs) internal pure returns (bytes memory data) {
    uint8 length = uint8(addrs.length);
    data = bytes.concat(data, bytes1(length));
    for (uint8 i = 0; i < length; ++i) {
      data = bytes.concat(data, bytes20(addrs[i]));
    }
    return data;
  }

  function _writeUint256ArrayAsUint128Array(uint256[] memory us)
    internal
    pure
    returns (bytes memory data)
  {
    uint8 length = uint8(us.length);
    data = bytes.concat(data, bytes1(length));
    for (uint8 i = 0; i < length; ++i) {
      data = bytes.concat(data, bytes16(uint128(us[i])));
    }
    return data;
  }

  function _writeBytes(bytes memory b) internal pure returns (bytes memory data) {
    uint32 length = uint32(b.length);
    data = bytes.concat(data, bytes4(length));
    data = bytes.concat(data, b);
    return data;
  }

  function _writeBytesArray(bytes[] memory bytesArray) internal pure returns (bytes memory data) {
    uint8 x = uint8(bytesArray.length);
    data = bytes.concat(data, bytes1(x));
    for (uint8 i; i < x; ++i) {
      uint32 length = uint32(bytesArray[i].length);
      data = bytes.concat(data, bytes4(length));
      data = bytes.concat(data, bytesArray[i]);
    }
    return data;
  }

  function _writeBytes32Array(bytes32[] memory bytesArray)
    internal
    pure
    returns (bytes memory data)
  {
    uint8 x = uint8(bytesArray.length);
    data = bytes.concat(data, bytes1(x));
    for (uint8 i; i < x; ++i) {
      data = bytes.concat(data, bytesArray[i]);
    }
    return data;
  }

  function _writeSwap(IAggregationExecutorOptimistic.Swap memory swap)
    internal
    pure
    returns (bytes memory shortData)
  {
    shortData = bytes.concat(shortData, _writeBytes(swap.data));
    shortData = bytes.concat(shortData, bytes1(uint8(uint32(swap.functionSelector))));
  }
}


contract KyberInputScalingHelperL2 is CalldataWriter{
  using ExecutorReader for bytes;
  using ScalingDataL2Lib for bytes;

  uint256 private constant _PARTIAL_FILL = 0x01;
  uint256 private constant _REQUIRES_EXTRA_ETH = 0x02;
  uint256 private constant _SHOULD_CLAIM = 0x04;
  uint256 private constant _BURN_FROM_MSG_SENDER = 0x08;
  uint256 private constant _BURN_FROM_TX_ORIGIN = 0x10;
  uint256 private constant _SIMPLE_SWAP = 0x20;

  struct PositiveSlippageFeeData {
    uint256 partnerPSInfor;
    uint256 expectedReturnAmount;
  }

  enum DexIndex {
    UNI, // works
    KyberDMM,
    Velodrome,
    Fraxswap,
    Camelot,
    KyberLO,
    RFQ,
    Hashflow,
    StableSwap,
    Curve,
    UniswapV3KSElastic, //works
    BalancerV2, // works
    DODO,
    GMX,
    Synthetix,
    wstETH,
    stETH,
    Platypus,
    PSM,
    Maverick,
    SyncSwap,
    AlgebraV1,
    BalancerBatch,
    Mantis,
    Wombat, // ???
    iZiSwap,
    TraderJoeV2,
    WooFiV2,
    KyberDSLO,
    LevelFiV2,
    GMXGLP,
    PancakeStableSwap,
    Vooi,
    VelocoreV2,
    Smardex
  }

  function getScaledInputData(
    bytes calldata inputData,
    uint256 newAmount
  ) external pure returns (bytes memory) {
    bytes4 selector = bytes4(inputData[:4]);
    bytes calldata dataToDecode = inputData[4:];

    if (selector == IMetaAggregationRouterV2.swap.selector) {
      IMetaAggregationRouterV2.SwapExecutionParams memory params =
        abi.decode(dataToDecode, (IMetaAggregationRouterV2.SwapExecutionParams));

      (params.desc, params.targetData) = _getScaledInputDataV2(
        params.desc, params.targetData, newAmount, _flagsChecked(params.desc.flags, _SIMPLE_SWAP)
      );

      return abi.encodeWithSelector(selector, params);
    } else if (selector == IMetaAggregationRouterV2.swapSimpleMode.selector) {
      (
        address callTarget,
        IMetaAggregationRouterV2.SwapDescriptionV2 memory desc,
        bytes memory targetData,
        bytes memory clientData
      ) = abi.decode(
        dataToDecode, (address, IMetaAggregationRouterV2.SwapDescriptionV2, bytes, bytes)
      );

      (desc, targetData) = _getScaledInputDataV2(desc, targetData, newAmount, true);

      return abi.encodeWithSelector(selector, callTarget, desc, targetData, clientData);
    } else {
      revert("InputScalingHelper: Invalid selector");
    }
  }

  function _getScaledInputDataV2(
    IMetaAggregationRouterV2.SwapDescriptionV2 memory desc,
    bytes memory executorData,
    uint256 newAmount,
    bool isSimpleMode
  ) internal pure returns (IMetaAggregationRouterV2.SwapDescriptionV2 memory, bytes memory) {
    uint256 oldAmount = desc.amount;
    if (oldAmount == newAmount) {
      return (desc, executorData);
    }

    // simple mode swap
    if (isSimpleMode) {
      return (
        _scaledSwapDescriptionV2(desc, oldAmount, newAmount),
        _scaledSimpleSwapData(executorData, oldAmount, newAmount)
      );
    }
    //normal mode swap
    return (
      _scaledSwapDescriptionV2(desc, oldAmount, newAmount),
      _scaledExecutorCallBytesData(executorData, oldAmount, newAmount)
    );
  }

  /// @dev Scale the swap description
  function _scaledSwapDescriptionV2(
    IMetaAggregationRouterV2.SwapDescriptionV2 memory desc,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (IMetaAggregationRouterV2.SwapDescriptionV2 memory) {
    desc.minReturnAmount = (desc.minReturnAmount * newAmount) / oldAmount;
    if (desc.minReturnAmount == 0) desc.minReturnAmount = 1;
    desc.amount = desc.amount * newAmount / oldAmount;

    uint256 nReceivers = desc.srcReceivers.length;
    for (uint256 i = 0; i < nReceivers;) {
      desc.srcAmounts[i] = (desc.srcAmounts[i] * newAmount) / oldAmount;
      unchecked {
        ++i;
      }
    }
    return desc;
  }

  /// @dev Scale the executorData in case swapSimpleMode
  function _scaledSimpleSwapData(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    IMetaAggregationRouterV2.SimpleSwapData memory simpleSwapData =
      abi.decode(data, (IMetaAggregationRouterV2.SimpleSwapData));
    uint256 nPools = simpleSwapData.firstPools.length;
    address tokenIn;

    for (uint256 i = 0; i < nPools;) {
      simpleSwapData.firstSwapAmounts[i] =
        (simpleSwapData.firstSwapAmounts[i] * newAmount) / oldAmount;

      IAggregationExecutorOptimistic.Swap[] memory dexData;

      (dexData, tokenIn) = simpleSwapData.swapDatas[i].readSwapSingleSequence();

      // only need to scale the first dex in each sequence
      if (dexData.length > 0) {
        dexData[0] = _scaleDexData(dexData[0], oldAmount, newAmount);
      }

      simpleSwapData.swapDatas[i] =
        _writeSwapSingleSequence(abi.encode(dexData), tokenIn);

      unchecked {
        ++i;
      }
    }

    simpleSwapData.positiveSlippageData =
      _scaledPositiveSlippageFeeData(simpleSwapData.positiveSlippageData, oldAmount, newAmount);

    return abi.encode(simpleSwapData);
  }

  /// @dev Scale the executorData in case normal swap
  function _scaledExecutorCallBytesData(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory) {
    IAggregationExecutorOptimistic.SwapExecutorDescription memory executorDesc =
      abi.decode(data.readSwapExecutorDescription(), (IAggregationExecutorOptimistic.SwapExecutorDescription));
    executorDesc.positiveSlippageData =
      _scaledPositiveSlippageFeeData(executorDesc.positiveSlippageData, oldAmount, newAmount);
    uint256 nSequences = executorDesc.swapSequences.length;
    for (uint256 i = 0; i < nSequences;) {
      // only need to scale the first dex in each sequence
      IAggregationExecutorOptimistic.Swap memory swap = executorDesc.swapSequences[i][0];
      
      executorDesc.swapSequences[i][0] = _scaleDexData(swap, oldAmount, newAmount);
      unchecked {
        ++i;
      }
    }
    return writeSwapExecutorDescription(executorDesc);
  }

  function _scaledPositiveSlippageFeeData(
    bytes memory data,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (bytes memory newData) {
    if (data.length > 32) {
      PositiveSlippageFeeData memory psData = abi.decode(data, (PositiveSlippageFeeData));
      uint256 left = uint256(psData.expectedReturnAmount >> 128);
      uint256 right = (uint256(uint128(psData.expectedReturnAmount)) * newAmount) / oldAmount;
      require(right <= type(uint128).max, "_scaledPositiveSlippageFeeData/Exceeded type range");
      psData.expectedReturnAmount = right | (left << 128);
      data = abi.encode(psData);
    } else if (data.length == 32) {
      uint256 expectedReturnAmount = abi.decode(data, (uint256));
      uint256 left = uint256(expectedReturnAmount >> 128);
      uint256 right = (uint256(uint128(expectedReturnAmount)) * newAmount) / oldAmount;
      require(right <= type(uint128).max, "_scaledPositiveSlippageFeeData/Exceeded type range");
      expectedReturnAmount = right | (left << 128);
      data = abi.encode(expectedReturnAmount);
    }
    return data;
  }

    // 10 working
  function _scaleDexData(
    IAggregationExecutorOptimistic.Swap memory swap,
    uint256 oldAmount,
    uint256 newAmount
  ) internal pure returns (IAggregationExecutorOptimistic.Swap memory) {
    uint8 functionSelectorIndex = uint8(uint32(swap.functionSelector));
    if (DexIndex(functionSelectorIndex) == DexIndex.UNI) {
      swap.data = swap.data.newUniSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.StableSwap) {
      swap.data = swap.data.newStableSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Curve) {
      swap.data = swap.data.newCurveSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.KyberDMM) {
      swap.data = swap.data.newKyberDMM(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.UniswapV3KSElastic) {
      swap.data = swap.data.newUniswapV3KSElastic(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.RFQ) {
      revert("InputScalingHelper: Can not scale RFQ swap");
    } else if (DexIndex(functionSelectorIndex) == DexIndex.BalancerV2) {
      swap.data = swap.data.newBalancerV2(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.wstETH) {
      swap.data = swap.data.newWrappedstETHSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.stETH) {
      swap.data = swap.data.newStETHSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.DODO) {
      swap.data = swap.data.newDODO(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Velodrome) {
      swap.data = swap.data.newVelodrome(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.GMX) {
      swap.data = swap.data.newGMX(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Synthetix) {
      swap.data = swap.data.newSynthetix(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Hashflow) {
      revert("InputScalingHelper: Can not scale Hashflow swap");
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Camelot) {
      swap.data = swap.data.newCamelot(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.KyberLO) {
      revert("InputScalingHelper: Can not scale KyberLO swap");
    } else if (DexIndex(functionSelectorIndex) == DexIndex.PSM) {
      swap.data = swap.data.newPSM(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Fraxswap) {
      swap.data = swap.data.newFrax(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Platypus) {
      swap.data = swap.data.newPlatypus(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Maverick) {
      swap.data = swap.data.newMaverick(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.SyncSwap) {
      swap.data = swap.data.newSyncSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.AlgebraV1) {
      swap.data = swap.data.newAlgebraV1(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.BalancerBatch) {
      swap.data = swap.data.newBalancerBatch(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Mantis) {
      swap.data = swap.data.newMantis(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Wombat) {
      swap.data = swap.data.newMantis(oldAmount, newAmount); // @dev use identical calldata structure as Mantis
    } else if (DexIndex(functionSelectorIndex) == DexIndex.iZiSwap) {
      swap.data = swap.data.newIziSwap(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.TraderJoeV2) {
      swap.data = swap.data.newTraderJoeV2(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.WooFiV2) {
      swap.data = swap.data.newMantis(oldAmount, newAmount); // @dev use identical calldata structure as Mantis
    } else if (DexIndex(functionSelectorIndex) == DexIndex.KyberDSLO) {
      revert("InputScalingHelper: Can not scale KyberDSLO swap");
    } else if (DexIndex(functionSelectorIndex) == DexIndex.LevelFiV2) {
      swap.data = swap.data.newLevelFiV2(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.PancakeStableSwap) {
      swap.data = swap.data.newCurveSwap(oldAmount, newAmount); // @dev same encoded data as Curve
    } else if (DexIndex(functionSelectorIndex) == DexIndex.GMXGLP) {
      swap.data = swap.data.newGMXGLP(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Vooi) {
      swap.data = swap.data.newVooi(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.VelocoreV2) {
      swap.data = swap.data.newVelocoreV2(oldAmount, newAmount);
    } else if (DexIndex(functionSelectorIndex) == DexIndex.Smardex) {
      swap.data = swap.data.newMantis(oldAmount, newAmount); // @dev use identical calldata structure as Mantis
    } else {
      revert("InputScaleHelper: Dex type not supported");
    }
    return swap;
  }

  function _flagsChecked(uint256 number, uint256 flag) internal pure returns (bool) {
    return number & flag != 0;
  }
}