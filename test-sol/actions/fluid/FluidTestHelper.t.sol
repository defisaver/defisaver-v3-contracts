
import { FluidHelper } from "../../../contracts/actions/fluid/helpers/FluidHelper.sol";
import { IFluidVaultT1 } from "../../../contracts/interfaces/fluid/IFluidVaultT1.sol";

contract FluidTestHelper is FluidHelper {

    function getT1Vaults() internal pure returns (IFluidVaultT1[] memory vaults) {
        vaults = new IFluidVaultT1[](1);
        vaults[0] = IFluidVaultT1(0x1982CC7b1570C2503282d0A0B41F69b3B28fdcc3); // wstETH/USDC
        //vaults[1] = IFluidVaultT1(0x0C8C77B7FF4c2aF7F6CEBbe67350A490E3DD6cB3); // eth/USDC
    }
}