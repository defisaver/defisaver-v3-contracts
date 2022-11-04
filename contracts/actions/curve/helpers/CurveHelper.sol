// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../interfaces/curve/IDepositZap.sol";
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

    error CurveHelperInvalidPool();

    enum DepositTargetType {
        SWAP,
        ZAP_POOL,
        ZAP_CURVE
    }

    function makeFlags(
        DepositTargetType depositTargetType,
        bool explicitUnderlying,
        bool removeOneCoin,
        bool withdrawExact
    ) public pure returns (uint8 flags) {
        flags = uint8(depositTargetType);
        flags |= (explicitUnderlying ? 1 : 0) << 2;
        flags |= (withdrawExact ? 1 : 0) << 3;
        flags |= (removeOneCoin ? 1 : 0) << 4;
    }

    function parseFlags(
        uint8 flags
    ) public pure returns (
        DepositTargetType depositTargetType,
        bool explicitUnderlying,
        bool removeOneCoin,
        bool withdrawExact
    ) {
        depositTargetType = DepositTargetType(flags & 3);
        explicitUnderlying = flags & (1 << 2) > 0;
        withdrawExact = flags & (1 << 3) > 0;
        removeOneCoin = flags & (1 << 4) > 0;
    }

    function getSwaps() internal view returns (ISwaps) {
        return ISwaps(AddressProvider.get_address(2));
    }

    function getRegistry() internal view returns (IRegistry) {
        return IRegistry(AddressProvider.get_registry());
    }

    function _getPoolParams(address _depositTarget, DepositTargetType _depositTargetType, bool _explicitUnderlying) internal view returns (
        address lpToken,
        uint256 N_COINS,
        address[8] memory tokens
    ) {
        address pool;
        bool underlying = false;

        if (_depositTargetType == DepositTargetType.SWAP) {
            pool = _depositTarget;
        } else {
            underlying = true;

            if (_depositTargetType == DepositTargetType.ZAP_POOL) {
                pool = IDepositZap(_depositTarget).pool();
            } else {
                pool = IDepositZap(_depositTarget).curve();
            }
        }

        IRegistry poolRegistry = getRegistry();
        lpToken = poolRegistry.get_lp_token(pool);
        if (lpToken == address(0)) revert CurveHelperInvalidPool();

        N_COINS = poolRegistry.get_n_coins(pool)[(_explicitUnderlying || underlying) ? 1 : 0];

        if (underlying || _explicitUnderlying) {
            tokens = poolRegistry.get_underlying_coins(pool);
        } else {
            tokens =  poolRegistry.get_coins(pool);
        }
    }
}