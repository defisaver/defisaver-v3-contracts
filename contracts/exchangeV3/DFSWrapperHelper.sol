// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/token/IERC20.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { DFSExchangeData } from "./DFSExchangeData.sol";
import { ExchangeHelper } from "./helpers/ExchangeHelper.sol";
import { SafeERC20 } from "../_vendor/openzeppelin/SafeERC20.sol";

/// @title DFSWrapperHelper
/// @notice Helper contract used by other Wrapper contracts
contract DFSWrapperHelper is ExchangeHelper {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    error InvalidOffchainData();
    error ZeroTokensSwapped();

    /// @notice Sends leftover tokens including ETH to the recipient
    /// @param _srcAddr Source token address
    /// @param _destAddr Destination token address
    /// @param _to Recipient address
    function _sendLeftover(address _srcAddr, address _destAddr, address payable _to) internal {
        TokenUtils.ETH_ADDR.withdrawTokens(_to, type(uint256).max);
        _srcAddr.withdrawTokens(_to, type(uint256).max);
        _destAddr.withdrawTokens(_to, type(uint256).max);
    }

    /// @notice Approves the allowance target, executes the aggregator call and revokes the allowance
    /// @param _exData The exchange data
    /// @param _realCalldata Calldata forwarded to the aggregator
    /// @return success Whether the aggregator call was successful
    /// @return tokensSwapped Amount of destination tokens received
    function _executeOffchainSwap(
        DFSExchangeData.ExchangeData memory _exData,
        bytes memory _realCalldata
    ) internal returns (bool success, uint256 tokensSwapped) {
        if (!_exchangeAggRegistry.isExchangeAggregatorAddr(_exData.offchainData.exchangeAddr)) {
            return (false, 0);
        }

        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        (success,) = _exData.offchainData.exchangeAddr.call(_realCalldata);

        if (success) {
            // Gets the current balance of the swapped tokens.
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;

            if (tokensSwapped == 0) revert ZeroTokensSwapped();
        }

        _exData.srcAddr.removeAllowance(_exData.offchainData.allowanceTarget);
    }

    /// @notice Writes a uint256 to a bytes array
    /// @param _b Bytes array
    /// @param _index Index to write the uint256 to
    /// @param _input Uint256 to write
    function _writeUint256(bytes memory _b, uint256 _index, uint256 _input) internal pure {
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
