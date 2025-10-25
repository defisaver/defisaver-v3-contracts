// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../utils/TokenUtils.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";

contract DFSExchangeHelper {
    using TokenUtils for address;

    error InvalidOffchainData();
    error OutOfRangeSlicingError();
    //Order success but amount 0
    error ZeroTokensSwapped();

    using SafeERC20 for IERC20;

    function sendLeftover(address _srcAddr, address _destAddr, address payable _to) internal {
        // clean out any eth leftover
        TokenUtils.ETH_ADDR.withdrawTokens(_to, type(uint256).max);

        _srcAddr.withdrawTokens(_to, type(uint256).max);
        _destAddr.withdrawTokens(_to, type(uint256).max);
    }

    function sliceUint(bytes memory bs, uint256 start) internal pure returns (uint256) {
        if (bs.length < start + 32) {
            revert OutOfRangeSlicingError();
        }

        uint256 x;
        assembly {
            x := mload(add(bs, add(0x20, start)))
        }

        return x;
    }

    function writeUint256(bytes memory _b, uint256 _index, uint256 _input) internal pure {
        if (_b.length < _index + 32) {
            revert InvalidOffchainData();
        }

        bytes32 input = bytes32(_input);

        _index += 32;

        // Read the bytes32 from array memory
        assembly {
            mstore(add(_b, _index), input)
        }
    }
}
