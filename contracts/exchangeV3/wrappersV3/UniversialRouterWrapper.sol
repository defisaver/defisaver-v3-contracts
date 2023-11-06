// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.8.10;

import "../../interfaces/exchange/IExchangeV3.sol";


interface IUniversialRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external;
}

contract UniversialRouterWrapper is IExchangeV3 {
    IUniversialRouter router = IUniversialRouter(address(0));

    function _execute(
        address,
        address,
        uint256,
        bytes calldata _additionalData
    ) internal {
        (bytes memory commands, bytes[] memory inputs, uint256 deadline) = abi.decode(_additionalData, (bytes, bytes[], uint256));
        router.execute(commands, inputs, deadline);
    }

    function sell(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        bytes calldata _additionalData
    ) external override returns (uint256) {
        _execute(_srcAddr, _destAddr, _srcAmount, _additionalData);
    }

    function buy(
        address _srcAddr,
        address _destAddr,
        uint256 _destAmount,
        bytes calldata _additionalData
    ) external override returns (uint256) {}

    function getSellRate(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        bytes calldata _additionalData
    ) external override returns (uint256) {}

    function getBuyRate(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        bytes calldata _additionalData
    ) external override returns (uint256) {}
}