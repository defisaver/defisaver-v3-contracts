// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/token/IERC20.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { SafeERC20 } from "../_vendor/openzeppelin/SafeERC20.sol";

/// @title DFSExchangeHelper
/// @notice Helper contract used by other Wrapper contracts
contract DFSExchangeHelper {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    error InvalidOffchainData();
    error OutOfRangeSlicingError();
    error ZeroTokensSwapped();

    /// @notice Sends leftover tokens including ETH to the recipient
    /// @param _srcAddr Source token address
    /// @param _destAddr Destination token address
    /// @param _to Recipient address
    function sendLeftover(address _srcAddr, address _destAddr, address payable _to) internal {
        TokenUtils.ETH_ADDR.withdrawTokens(_to, type(uint256).max);
        _srcAddr.withdrawTokens(_to, type(uint256).max);
        _destAddr.withdrawTokens(_to, type(uint256).max);
    }

    /// @notice Slices a uint256 from a bytes array
    /// @param _bs Bytes array
    /// @param _start Start index
    /// @return x Sliced uint256
    function sliceUint(bytes memory _bs, uint256 _start) internal pure returns (uint256) {
        if (_bs.length < _start + 32) {
            revert OutOfRangeSlicingError();
        }

        uint256 x;
        assembly {
            x := mload(add(_bs, add(0x20, _start)))
        }

        return x;
    }

    /// @notice Writes a uint256 to a bytes array
    /// @param _b Bytes array
    /// @param _index Index to write the uint256 to
    /// @param _input Uint256 to write
    function writeUint256(bytes memory _b, uint256 _index, uint256 _input) internal pure {
        if (_b.length < _index + 32) {
            revert InvalidOffchainData();
        }

        bytes32 input = bytes32(_input);

        _index += 32;

        assembly {
            mstore(add(_b, _index), input)
        }
    }
}
