// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ExchangeHelper } from "../exchangeV3/helpers/ExchangeHelper.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";

contract DFSPricesView is ExchangeHelper {
    error OutOfRangeSlicingError();

    /// @notice Returns the best estimated price from 2 exchanges
    /// @param _amount Amount of source tokens you want to exchange
    /// @param _srcToken Address of the source token
    /// @param _destToken Address of the destination token
    /// @param _wrappers Array of wrapper addresses to compare
    /// @return (address, uint) The address of the best exchange and the exchange price
    function getBestPrice(
        uint256 _amount,
        address _srcToken,
        address _destToken,
        address[] memory _wrappers,
        bytes[] memory _additionalData
    ) public returns (address, uint256) {
        uint256[] memory rates = new uint256[](_wrappers.length);
        for (uint256 i = 0; i < _wrappers.length; i++) {
            rates[i] = getExpectedRate(_wrappers[i], _srcToken, _destToken, _amount, _additionalData[i]);
        }

        return getBiggestRate(_wrappers, rates);
    }

    /// @notice Return the expected rate from the exchange wrapper
    /// @dev In case of Oasis/Uniswap handles the different precision tokens
    /// @param _wrapper Address of exchange wrapper
    /// @param _srcToken From token
    /// @param _destToken To token
    /// @param _amount Amount to be exchanged
    function getExpectedRate(
        address _wrapper,
        address _srcToken,
        address _destToken,
        uint256 _amount,
        bytes memory _additionalData
    ) public returns (uint256) {
        bool success;
        bytes memory result;

        (success, result) = _wrapper.call(
            abi.encodeWithSignature(
                "getSellRate(address,address,uint256,bytes)", _srcToken, _destToken, _amount, _additionalData
            )
        );

        if (success) {
            return sliceUint(result, 0);
        }

        return 0;
    }

    /// @notice Finds the biggest rate between exchanges, needed for sell rate
    /// @param _wrappers Array of wrappers to compare
    /// @param _rates Array of rates to compare
    function getBiggestRate(address[] memory _wrappers, uint256[] memory _rates)
        internal
        pure
        returns (address, uint256)
    {
        uint256 maxIndex = 0;

        // starting from 0 in case there is only one rate in array
        for (uint256 i = 0; i < _rates.length; i++) {
            if (_rates[i] > _rates[maxIndex]) {
                maxIndex = i;
            }
        }

        return (_wrappers[maxIndex], _rates[maxIndex]);
    }

    function getDecimals(address _token) internal view returns (uint256) {
        if (_token == TokenUtils.ETH_ADDR) return 18;

        return IERC20(_token).decimals();
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
}
