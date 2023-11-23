// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.8.10;


interface ISwapRouterNG {
    function get_dy(
        address[11] memory _route,
        uint256[5][5] memory _swap_params,
        uint256 _amount,
        address[5] memory _pools
    ) external view returns (uint256);

    function exchange(
        address[11] memory _route,
        uint256[5][5] memory _swap_params,
        uint256 _amount,
        uint256 _expected,
        address[5] memory _pools,
        address _receiver
    ) external payable returns (uint256);
}
