// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/curve/ICurveFactory.sol";
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

    error CurveHelperInvalidLPToken(address);
    error CurveHelperOneCoinAmbiguousIndex();
    error CurveHelperInvalidFlags();

    enum DepositTargetType {
        SWAP,
        ZAP_POOL,
        ZAP_CURVE,
        ZAP_3POOL
    }

    struct CurveCache {
        address lpToken;
        address pool;
        address depositTarget;
        bool isFactory;
        uint256 N_COINS;
        address[8] tokens;
    }

    function makeFlags(
        DepositTargetType depositTargetType,
        bool explicitUnderlying,
        bool removeOneCoin,
        bool withdrawExact
    ) public pure returns (uint8 flags) {
        if (withdrawExact && removeOneCoin) revert CurveHelperInvalidFlags();
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
        if (withdrawExact && removeOneCoin) revert CurveHelperInvalidFlags();
    }

    function getSwaps() internal view returns (ISwaps) {
        return ISwaps(AddressProvider.get_address(2));
    }

    function getRegistry() internal view returns (IRegistry) {
        return IRegistry(AddressProvider.get_registry());
    }

    function _getPoolInfo(address _depositTargetOrPool, DepositTargetType _depositTargetType, bool _explicitUnderlying) internal view returns (
        CurveCache memory cache
    ) {
        bool underlying = false;
        cache.depositTarget = _depositTargetOrPool;

        if (_depositTargetType == DepositTargetType.ZAP_3POOL) {
            cache.pool = _depositTargetOrPool;
            cache.depositTarget = CURVE_3POOL_ZAP_ADDR;
            underlying = true;
        } else if (_depositTargetType == DepositTargetType.SWAP) {
            cache.pool = _depositTargetOrPool;
        } else {
            underlying = true;

            if (_depositTargetType == DepositTargetType.ZAP_POOL) {
                cache.pool = IDepositZap(_depositTargetOrPool).pool();
            } else {
                cache.pool = IDepositZap(_depositTargetOrPool).curve();
            }
        }

        IRegistry poolRegistry = getRegistry();
        cache.lpToken = poolRegistry.get_lp_token(cache.pool);
        if (cache.lpToken == address(0)) {
            // assume factory pool
            cache.isFactory = true;
            try ICurveFactoryPool(cache.pool).token() returns (address lpToken) {
                cache.lpToken = lpToken;
            } catch {
                revert CurveHelperInvalidLPToken(cache.lpToken);
            }

            cache.N_COINS = 2; // factory pools always have 2 tokens
            ICurveFactory factory = ICurveFactory(ICurveFactoryPool(cache.pool).factory());
            address[2] memory factoryTokens = factory.get_coins(cache.pool);
            cache.tokens[0] = factoryTokens[0];
            cache.tokens[1] = factoryTokens[1];
        } else {
            cache.N_COINS = poolRegistry.get_n_coins(cache.pool)[(_explicitUnderlying || underlying) ? 1 : 0];
            if (underlying || _explicitUnderlying) {
                cache.tokens = poolRegistry.get_underlying_coins(cache.pool);
            } else {
                cache.tokens =  poolRegistry.get_coins(cache.pool);
            }
        }
    }

    /// @dev small optimisation when looping over token balance checks in CurveWithdraw
    function _getFirstAndLastTokenIndex(uint256[] memory _amounts, bool _removeOneCoin, bool _withdrawExact) internal pure returns (uint256 firstIndex, uint256 lastIndex) {
        if (!_removeOneCoin && !_withdrawExact) {
            return (0, _amounts.length - 1);
        }

        bool firstIndexSet;
        for (uint256 i;  i < _amounts.length; i++) {
            if (_amounts[i] != 0) {
                lastIndex = i;
                if (!firstIndexSet) {
                    firstIndexSet = true;
                    firstIndex = i;
                }
            }
        }

        if (_removeOneCoin && (firstIndex != lastIndex)) revert CurveHelperOneCoinAmbiguousIndex();
    }
}