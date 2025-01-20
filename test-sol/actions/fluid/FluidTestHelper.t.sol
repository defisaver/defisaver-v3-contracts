
import { FluidHelper } from "../../../contracts/actions/fluid/helpers/FluidHelper.sol";
import { IFluidVaultT1 } from "../../../contracts/interfaces/fluid/IFluidVaultT1.sol";

contract FluidTestHelper is FluidHelper {

    function getT1Vaults() internal pure returns (IFluidVaultT1[] memory vaults) {
        vaults = new IFluidVaultT1[](2);
        vaults[0] = IFluidVaultT1(0x1234567890123456789012345678901234567890);
        vaults[1] = IFluidVaultT1(0x1234567890123456789012345678901234567891);
    }
}