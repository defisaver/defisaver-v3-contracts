import math

q96 = 2**96
def price_to_sqrtp(p):
    return int(math.sqrt(p) * q96)
def tick(p):
    return math.floor(math.log(p, 1.0001))
def liquidity0(amount, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return (amount * (pa * pb) / q96) / (pb - pa)
def liquidity1(amount, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return amount * q96 / (pb - pa)
def calc_amount0(liq, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return int(liq * q96 * (pb - pa) / pa / pb)
def calc_amount1(liq, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return int(liq * (pb - pa) / q96)


# y = eth
# x = bold

eth = 10**18
amount_eth =  100000000 * eth
amount_bold = 100000000 * 2600 * eth
sqrt_low = price_to_sqrtp(2500)
sqrt_cur = price_to_sqrtp(2600)
sqrt_upp = price_to_sqrtp(2700)

print(sqrt_low, sqrt_cur, sqrt_upp)

lowTick = tick(2500)
curTick = tick(2600)
uppTick = tick(2700)

print(lowTick, curTick, uppTick)

liq0 = liquidity0(amount_eth, sqrt_cur, sqrt_upp)
liq1 = liquidity1(amount_bold, sqrt_cur, sqrt_low)
liq = int(min(liq0, liq1))

print(liq)

amount0 = calc_amount0(liq, sqrt_upp, sqrt_cur)
amount1 = calc_amount1(liq, sqrt_low, sqrt_cur)

print(amount0, amount1)