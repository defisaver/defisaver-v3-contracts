// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../interfaces/curve/IAddressProvider.sol";
import "../../../interfaces/curve/ISwaps.sol";
import "../../../interfaces/curve/IRegistry.sol";
import "../../../interfaces/curve/IMinter.sol";
import "../../../interfaces/curve/IVotingEscrow.sol";
import "../../../interfaces/curve/IFeeDistributor.sol";
import "./MainnetCurveAddresses.sol";

contract CurveHelper is MainnetCurveAddresses {
    IAddressProvider public constant AddressProvider = IAddressProvider(ADDRESS_PROVIDER_ADDR);
    IMinter public constant Minter = IMinter(MINTER_ADDR);
    IVotingEscrow public constant VotingEscrow = IVotingEscrow(VOTING_ESCROW_ADDR);
    IFeeDistributor public constant FeeDistributor = IFeeDistributor(FEE_DISTRIBUTOR_ADDR);

    function getSwaps() internal view returns (ISwaps) {
        return ISwaps(AddressProvider.get_address(2));
    }

    function getRegistry() internal view returns (IRegistry) {
        return IRegistry(AddressProvider.get_registry());
    }
}