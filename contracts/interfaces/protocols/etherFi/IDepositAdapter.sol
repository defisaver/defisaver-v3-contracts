// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDepositAdapter {
    struct PermitInput {
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function depositWstETHForWeETHWithPermit(
        uint256 _amount,
        uint256 _minOutAmount,
        address _referral,
        PermitInput calldata _permit
    ) external returns (uint256);
}
