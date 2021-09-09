// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../../interfaces/curve/IAddressProvider.sol";
import "../../../interfaces/curve/ISwaps.sol";
import "../../../interfaces/curve/IMinter.sol";
import "../../../interfaces/curve/IVotingEscrow.sol";

contract CurveHelper {
    address public constant CRV_TOKEN_ADDR = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    address public constant ADDRESS_PROVIDER_ADDR = 0x0000000022D53366457F9d5E68Ec105046FC4383;
    address public constant MINTER_ADDR = 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0;
    address public constant VOTING_ESCROW_ADDR = 0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2;

    IAddressProvider public constant AddressProvider = IAddressProvider(ADDRESS_PROVIDER_ADDR);
    IMinter public constant Minter = IMinter(MINTER_ADDR);
    IVotingEscrow public constant VotingEscrow = IVotingEscrow(VOTING_ESCROW_ADDR);

    function getSwaps() internal view returns (ISwaps) {
        return ISwaps(AddressProvider.get_address(2));
    }
}