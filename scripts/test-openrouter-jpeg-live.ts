// ==============================================================================
// PaperSite: Live OpenRouter JPEG Multimodal Verification
// File: scripts/test-openrouter-jpeg-live.ts
// Tests sending an authentic JPEG wireframe sketch directly to the configured
// OpenRouter free vision model (nvidia/nemotron-3.5-super-vl:free).
// Never prints API keys, authorization headers, or base64 image data.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import {
  OPENROUTER_FREE_MODEL,
  resolveImageDataUri,
} from '../supabase/functions/_shared/openrouterJson';
/**
 * Authentic 400x300 JPEG wireframe sketch (quality 0.85).
 * Contains visible drawn sections:
 * - HEADER: Brew Bay Cafe
 * - HERO: Best Artisan Coffee in Town
 * - Espresso Menu card
 * - Pastry Specials card
 * - BOOK A TABLE button
 */
const SAMPLE_WIREFRAME_JPEG_BASE64 =
  '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Bkok+exGVi7cAGZwc+7metJZNoTE2bYUQUOpMprSZw814UsktsFdUWWXnM2y/wD4xb8TpA/PMMZ5TspQlt+Il62IZBHopuSfFT+RHYiHxkOH0plVcR1YrmE4mc0ikKbaOYRfDIg21KNSm2CsWgm/mudiKxWud9vBumj5zQymca5FJ6OklNNSecxlYQzTEA7T5QbiIhK0ESVnpGnRsSUmos72Mr2zMtC7IONh5liBVMqipbBSyYplbKoFb0ndmEbMSJtSjQ0ZmpqHQm67uIIjI0mdzsdusABycOZjKZczyiUyeZ1LgiuIlsvi1RUjeJ9brCHOFNuHToadyPS0D5L3sfIJ7TkkW5UbEkmtRRsNWKKgNa5bDUq09GEsnNPhzjDWhRtGXjH42RZ6JlmO2gBycGJC5MwAAWAAAAAAAAAAAAAAAAAAAAAAAAAAAEF9Nf3F9AvQgvpr+4voBPE7fa9AAAoAAAOZa/q+TUP2Wq59PlvIgkSdLRm03pq0lIsWQ3TWXwv53NNhVvFKnPej28fdnuH23olftvguEt5vtZ2Hi8nnRb5AI6aomcpaFrL4X87mmwq3hrL4X87mmwq3jffJ50W+QHk86LfIB3r3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreGsvhfzuabCreN98nnRb5AeTzot8gDr3hoWsvhfzuabCreNLoCr5NXHZaon0hW8uCXJ1NEbregrSSjPIXHyedFvkD2ybvR7eLuN3D7b0Tt2pwXCW8/2c7A5pqmYzlnAAAWAAAHMtf0hJq47LVchnyHlwS5Ol0yac0FaSUXLMbpq0YX81mu2nuGK9Nf3F9AvYI0UU1TMzHdGdWjC/ms1209watGF/NZrtp7hZgBq1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4NWjC/ms1209wswAWqNkZ1aML+azXbT3Bq0YX81mu2nuFmAC1RsjOrRhfzWa7ae4aXQFISah+y1RIZCh5EEiTqdInXNNWkpGeY6aEF9Nf3F9AMV0U05TEd16AABcAAAQT01/cX0C9iCemv7i+gXsE8Pv9gDXKjrGWSKqqfpuLYjFxc+W6iFW0hJtoNtJKVpmaiMsjysRj5z2t5VJ6tZpmJh41cY9LXpilbaEm2TTV9IjM1EellkVrfmQN6obOAksrx0gJrAtR0sw4xIjYR7NuIh5IlxtZXtkpLhkeZGMnU+LssklWxFMNUlWE5mMPDtxDyZVLkxBIQsiMrlpkZctjuXKDNyndRwGl0vibTE8puazx1UbJWpOtTczh5oxwL8IZZ2WgjPl8xEZmfJy5DBSvHCl4qNgUR0lqmSy+YOE1BTWZSw2oKIUr7Gi4SjyUWZGZEVszsDuundUQAaXiRiNLKGjpTAxcmns2i5sbiYViVQqX3FGgiNRaJrSZ5K81+QwdmYiM5boA0WhcT5PVVRP06qTVDIZs1DlEphJzA9rOOtXsa0FpHciO3LblyvY7b0BExPwAAwslqeUzioZzIoBx1yKkymkRhm2aUpW4RqJJGfKdiudssyzPOx3NmgGAxBq2V0RS8RUM3REuwzK0IJqGQSnXFLUSUpSRmRGdz+/wAxj9UDVUsrWlYSo5Ql9ELE6RE2+kkuIUlRpNKiIzIjuX3mDmcZ5M6AwtZVPKaTlTcym7jqWnYhuGaS22alLdcOyUl5i/uZkWQ/cLPOHqqMkHcebtdqsIe7fchtGEd0reIhy/jLK+ZWysYGcfDLgAA6AA/EQ81Dw7kREOoaZaSa3FrVZKUkVzMzPkIiAfsBKlY8Ugh9t52VVM1I3X+Abn65YopctWZXJy+kZXIy+zyl92Yqja0OIS42pK0KIjSpJ3IyPzkDMVRPw/oDVMR67ldDQkA7HwE1mL8wie1oSElsNwz7q7GeSTMiP/zfPIjHglGJssmtcFSMHT9SKjENNuRj5wJExAmtvhEoeXpXQq2VrGV8iM8wNUROTegAAaAGIqee9wmYJzuPN5p21FohtGXQ3DKZ0r/6jhXLRbK2avMMuAAPy6vQbUvRUrRIz0Ulcz/IvzEkcx4ljc3blC8PMRkzFxs3W4Q5KknloI7GskcJpGn87WBmaop+VdAeeWRXb0uho3taIhuHaS5wMQjQdb0ivorT5lFexl949ANAAAAAAAAAAAAAAAAACC+mv7i+gXoQX01/cX0AnidvtegAAUAAAEE9Nf3F9AvYgnpr+4voF7BPD7/aI9kFCTSPxVw0hJLOO48wcfjSYje1kv8AAnwaDM+DVkrK5Z/eMFMpRVEoxqh2apq/vmiHKUj1NP8Ac1uD4JNlFo6LZmSs87mOgIyVyyMjoSPi5dBxEXBmo4V91hKnGDUVlGhRldNy5bWuPzFSiVRUemYRMsgn4xLKmExDjCVOE0r7SCUZX0T85chg5OHnObmjBSPmMPh/JNHH+n6dhkEZnJ4iCglOMp4RV0mtxZLz5bmXnGcn8urCbdkRVqqEqhmSx7chhnUqXBtxCIorJ0UGayMkEZ2PSIj/ALCv+DjDz2Dpb/6Qx/8AoM5DSiVQ0ycmUNLIJmOdaSy5EtsJS6ttP2UGoiuaSsVivYrA5GHOURLllMGqe4AVjHJKYxtXd12n6ph4gkE5dpwjMkoQRaLZJufJypV5iy33G2vqHqXBd2TyCbQM2mM4TDsS6XQqyXEE6a0mkjbLxkGVv+oizy5TIWiEk0ohJpFTSElUDDx8WRFExTUOhLr1uTTWRXVb8zHkllJ0tK5mqaSympNBR69LSioeBabdVpfautKSPPz55gW5iMmJkcnpeGqyBjIl6DVWbUmbhnU9umb5w5GVz4LSzTp/9ej/ALib9kq481iNhy5D1JDUy6T0ZozWIbbW3DeIjxjS4ZJO/JmfnFr7lSzuv3Y7mwfdLgeA7c4BPDcHe+hp20tG+dr2Hnn1OU9UHA93pDK5rwF+C7dhG3+Dva+jpkdr2Lk+4G6qM6coc6ws0msHirFREHWkuxHnT9LxZQcwgWG2zlymyUpKdBlRtnpHYs/GuZcn/VreBzMaitqRnUHU9KomMydWcezDR0e/MY5JkZupikGS20qLNRGZIIzK5GfKOrJDTNNyBbrkhp+UypbxETqoKDbZNZFyErQIr2ufKP7LaapyWTN+aS2QSqCj4jS4eKh4Ntt13SO6tJaSIzueZ3PMwTtTnE5uToJyVU9iHDVKubwc+inaiNsoyWzZ6GnCLuaJtxMLEJPTbsejooSV7W07GKTg1IqOlXZA1400iHh5rDRCClzS4tXCG243pvaKDV4+eZnY9H8iFmKl6aKe93ip2UFN9LS7fKCb7YvbRvwltK9suXkH37hSTu53d7jy7utoaHb3ayO2NG1rcJbStbK1wdpwspR/sgJjOZpiHR9J07JDn8TAO93IuATFIhyWltWi2Slr8Uivpct/MNPkMwmUnpXFmiJ9JVyCJegIidQUvXFIiODadQZLSlxHiqSR6Nrfef3GOlESmVonC5yiWwSZk40TK4wmEk8pvl0DXbSNORZXsPjMKfkMxjFRkwkkti4lcOqGU8/CoWtTJ3u2ajK5oO53TyZg7OHMznm5aq3D2ipXgDSNTLl6ijo+Jl6o+Ldi3T0kLI9MjLS0UkScisRWIv8AcbM0zJoPEKvoen5uUslDNFQ6IOPhFuRBMNEhJJcSpGktREWdyudsx0DESOSxElKSREnl70qShKCglwyFMElNtFPBmWjYrFYrZWH5llPyCVvnES2RyyCeNhMObkPCIbUbSfst3SRHolbJPIQOWsvhy1g/MZNRFUG0yqEiFRUhiH3Iql50qIh3iabNy70O8k3G3ysdjM0pIzsSPtDwYVOwbWMdBzSSrl8Kc34c4xDU7cj5g7dBmrt1VktpUpXjElKU/nmQ6vklMU1I3XnpJT0oljj6dF1cHBNsm4XLZRpIrl/cfOBpCk4Hgu0qXkkLwL/bLXAwDSODdtbhE2Tku2WkWYORgz6OUYml5WvBar63NUYmeyqpHTl8QmLcSUN/rtkeggj0SM73M7XyLPIdJ4lwcyneC86hIAlvR8XJ1aCUl4zijbuaS/M8y/3GwHTNOHKoiVHT8p7nxLhuxEL2m3wLqzMjNSkWspVyI7mV8iGVbQhtCW20pQhJESUpKxEReYgapw8oyRmm8UsMoDCCnimMxgIw2oeFh1SpCEOxKXkGkv8AgfaLRUnSvbzEZXMyvrtct0fUmN0+lmK0z7VlEFK2HZFDxcWqEZMlpu44XjJu5pZWPM7GVj0crimlaXTPO7qabk5TbT0+3igW+2NK1tLhNHSvbK9x9Z9TtPz9LSZ9IpZNUsmZtFGwjbxIM+XR0yO17FyATRMxlLllqRQ9XU/hZGVbDxUxcjpy7LSiIl1xDkTAJUo2yVZRH5z8bIzK2YyZ0zBU5U+MM0pSXuw81kkK0cscafcNcOTzRm+pN1ZnbSMjO9rZWHTUXKpXFuQbkVLYN9cEsnIRTrCVHDqIrEpFy8U7ecrD+wsslsLHRcdCy6EYi4zROKfbZSlx/RKydNRFdViyK97A5Z/7/DkjCxqcyiatx9Jz+k1R0XIYqIfgJPFx0TERSiZNSFxCXCU2h1LhlkZozUoiI72DA5mNTW9IzqCqelUTGZvLOPZho6PfmMckyM3ExSDJbaVFmojPQIzK5GfKOrpJTdOyN596SSGVSx2Itwy4ODbZU5YzMtI0kV+U+X7x/JbTVOSyZvzSWyCVQUfEaXDxUPBttuu6R3VpLSRGdzzO55mDkYMxl6pv2T3/ALJo3/5rgvqEwnVHyWoHMa5xNERLsTKYxx+BJMStDbLpNrVp6CTIlKytdRHlyWHUM0lcsmqGUTOXQcclh1L7JRDCXCbcT9ladIjsovMZZkPiUhkRImCCkstJMzMzjy7VRaKMysfC5ePkZl41waqw9U5sRhJGRUwwvpmOjn3IiJflbC3XXDupajQVzM/OY0mfmouyskJoIjV3tP2I/v01CsQULCwMGzBwUMzDQzKCQ0yygkIbSWRJSksiIvuIfJcrljk2bm65dBqmLTRtNxZsJN5CDzNJLtpEn8r2Bqac4iHIrj1Ov0BN6zmM/iUYtszZaWU9urTFtOk8SEstsEqxt6GX2TIrmV8rFnsR4ScsVnNMPm0uMvYg9zotSko8VlwjMonz/wDwXtmOknKbp1yepnzkglS5sm2jHKg2ziCsVis5bS5MuXkHpipTKouZQszipZBPx0ISiholxhKnWdIrK0FGV0389jzBOy5IhIiPq6h6mnMzZWkqTpRMjSbmd4nT/wBRRZ8uigiP+42yn6bl1JYg4QzSSLjWYyfQLiJo65FOOHFEUOgyJRKMyIiysRWItFOWRDoNFOU8iDjoNEhlaYaYLNyNZKEbJESs+VTibWWZ+czuPoqSSVT0A8qUS9TkuI0wKzhkaUKRlYybO3iZEReLbIgdjCZAAAFgAAAAAAAAAAQX01/cX0C9CC+mv7i+gE8Tt9r0AACgAAAgnpr+4voF7EE9Nf3F9AvYJ4ff7AAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEF9Nf3F9AvQgvpr+4voBPE7fa9AAAoAAAIJ6a/uL6BexBMS6GxR8Ni68oRuV/wDIohkqi3U/9tleKY/vGh6LdQEaappmfSflegEF40PRbqBxoei3UBq5xK9AILxoei3UDjQ9FuoBc4legEF40PRbqBxoei3UAucSvQCC8aHot1A40PRbqAXOJXoBBeND0W6gcaHot1ALnEr0AgvGh6LdQOND0W6gFziV6AQXjQ9FuoHGh6LdQC5xK9AILxoei3UDjQ9FuoBc4legEF40PRbqBxoei3UAucSvQCC8aHot1A40PRbqAXOJXoBBeND0W6gcaHot1ALnEr0AgvGh6LdQOND0W6gFziV6AQXjQ9FuoHGh6LdQC5xK9AILxoei3UDjQ9FuoBc4legEF40PRbqBxoei3UAucSvQCC8aHot1A40PRbqAXOJXoBBeND0W6gcaHot1ALnEr0AgvGh6LdQOND0W6gFziV6AQXjQ9FuoHGh6LdQC5xK9AILxoei3UDjQ9FuoBc4legEF40PRbqBxoei3UAucSvQgvpr+4voDjQ9FuoGGlDYo+GtFd123K/8AkVwylQjqf+2yfFIGaqpqy9J+V6AABYAAASPEzHCDoqtl0r3rzSbRSGEP6UIojuSiv9m18hgNY/8ATSqP2/4h6a/uL6BewRjVVM+qCax/6aVR+3/ENY/9NKo/b/iL2ANaa/L8QTWP/TSqP2/4hrH/AKaVR+3/ABF7ADTX5fiCax/6aVR+3/ENY/8ATSqP2/4i9gBpr8vxBNY/9NKo/b/iGsf+mlUft/xF7ADTX5fiCax/6aVR+3/ENY/9NKo/b/iL2AGmvy/EE1j/ANNKo/b/AIhrH/ppVH7f8RewA01+X4gmsf8AppVH7f8AENY/9NKo/b/iL2AGmvy/EE1j/wBNKo/b/iGsf+mlUft/xF7ADTX5fiCax/6aVR+3/ENY/wDTSqP2/wCIvYAaa/L8QTWP/TSqP2/4gz2ScH3RgoOMoSfQXbb6GELiDJCbqMi85Z8ovYgvZff0H/nU/SDNeumM816AABZBHuyTg+6MbBwdCT6N7UfWwtcOZLK6TMvMWXIGsf8AppVH7f8AEOxA/rz/ADqvqF7BGjXVGeaCax/6aVR+3/ENY/8ATSqP2/4i9gDWmvy/EE1j/wBNKo/b/iGsf+mlUft/xF7ADTX5fiCax/6aVR+3/ENY/wDTSqP2/wCIvYAaa/L8QTWP/TSqP2/4hrH/AKaVR+3/ABF7ADTX5fiCax/6aVR+3/ENY/8ATSqP2/4i9gBpr8vxBNY/9NKo/b/iGsf+mlUft/xF7ADTX5fiCax/6aVR+3/ENY/9NKo/b/iL2AGmvy/EE1j/ANNKo/b/AIhrH/ppVH7f8RewA01+X4gmsf8AppVH7f8AENY/9NKo/b/iL2AGmvy/EE1j/wBNKo/b/iM/hnjfB1rWyKV715pKYpbC39KLURWJJX+za+Yrggvpr+4voBmdVMx6r0AACwAAAgnpr+4voF7EE9Nf3F9AvYJ4ff7AAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAEF7L7+g/8AOp+kXoQXsvv6D/zqfpBPF/iV6AABRBOxA/rz/Oq+oXsQTsQP68/zqvqF7BPC/iAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAABBfTX9xfQL0IL6a/uL6ATxO32vQAAKAAACCemv7i+gXsQT01/cX0C9gnh9/tH8fqpqGSVVR0nk9Yw1Jwk1ciUxkfEQzDrbZISk0mfC5FmZlylyj3ULO3pVCTqeT7GWVVrLJfCcK+3BQEMg4Uiz0zNhSlHciMiIyzHhx+paoZ3VVHTiT0dDVZCSpyJVGQEREsNNuEtKSSR8LkeZGfIfIPrS8sn8XKZ/KU4L01RfbkApCHFRcO+xFr5CadRDpQvRspWd8vMDPrrn/AH/4ytI4w09UUY/BnJ6ik8SiAVMWGppAkycWwkjM1tGSjJRf3Mr3yvY7Y6QY80jN4mUEmUVNBQU1fKGh5jFS8kQnDmZkTRuEoyNVyt4tyK+ZlY7aPQlE1zI5hFRSaceounWJRElHy3u+cdDRjymjInGmtJRtquRGZqUeRERHy3xWHklryuMJqNpMqegYanGoxEY7OyjUGo2m3VnwZM20icvlpZkeXJc7GYrrV9nF+Qv1rMKVYklRvPy2JUxHxjcGlULCkRGZuuOEvxEZHmZXyPIf2lcX6aqCfQkqal0/gG5gpaZZHx8vUzCzA05/6KzPO5Zlci/85DF0pQk5VGYqQs2hzgYWpYpZQL5OIXptqbWnTskzMraRZKsY0PCbCOcSiq5Gczw3lEsXKXFORU+VOnn1RikH/pqZYQ6RNmeRnppMrXyI/FBrVXnCkQGNlJxlSMSlMvn7UJExxy+Hm7sBowD0QR24NLmle5mVvs/3sWY/s7xqpSU1HFyqIl1QOQsFFpg42bswGlAwzx2LQW5e5GRmRZJP8ricnh3iFD14mIkFKw1NRK5tw8ZP5VPFtwUbD6enouQalKX+WiVi0jPK2Y+uIeH1eRVczaYUzSLEBNI2LSqGqiUz1cESGTsRpiIdSlGs8rqNBFpGRGRHmRnNdeSoVzinIqWniZGmVz2fzQoftl6FksF2yuHa8y3PGIkkd/vPzXtcr7RSlQSmqJBCz2RxaYqAik6TbhEZHkdjIyPMjIyMjI/uEvmkjxEpDEebVXTNOwVWtT6BYZi2jjm4RyHfZQSdO68jQeZ2LP8AtbPb8E6RjaKoGGk8ziGXo9bzsTEmyX+mhbijUaU/eRZFcG6Zqmr1SvCDFmp4irKrh6wmSYqWw0PGRMuM2Gm9EoZwyWi6EkZ+KaeW/J/cfrA3FufuSqrZziTNzchZaiEdh224VtKk8OSlJQkm0kalKugiI7/3LMxgZzg1XMbSTTENLThpkqpI03bRbRf+r4kkkpZnp2t4peL9rPkGaqvB2o5ueIUNCwDLEPFxMviJMTj6Cbiih2zSps9FV0XI7FfRztnbMEYuQpEqxcp+Nlc7ioqUVDKIuTQZx0RLZlAkxFLYIv8AiISarKIzIy+0WZZ2yMeWmMbKWn09k8qbldRQCZyi8vjI6A4KGiFkRGaEL0j0lEZ6JmRGm5cuZX0Gl8LZs1T1YPwuG0upOJjZK7AQMIidORkREOLTczU4p02koMyKxGRKI/Pbl2J+h6oVLcH2Uyu66ddbVNS7Yb/9HIm0Ef8A1ePmR/ZuDcVVtoVi3TiaBnNaHBTbufKI1UFEN8E3wylpWlBmktOxpuouUyPlyG+wj6ImFaiGyUSHUJWklcpEZXzHNE9oTFWHoSrcP5bR8JHQUxmq49ialNGkcIhTiFEhLSjIyVlyqMiyPlyv0lKWnGJXCMOp0XG2EJUV72MkkRg3RVVPy9IAAKAgvZff0H/nU/SL0IL2X39B/wCdT9IJ4v8AEr0AACiCdiB/Xn+dV9QvYgnYgf15/nVfUL2CeF/EIDU9W1RE4x1PTvhcllDyyWtwyoVMbAwjhOmtsjUSVOmkzsefKfL5hmMOsWnmsLCn1XdsTaLKauSuCXLIPSdmyiPxVNNlYjM/G+4vF+/Ie2VYctx+NNZT+qaWlkxlEczCFLnY1lmII1Ib0XNFKrqRyEWZFf8AMerGynqriKfkMFQcG6cDAxie3ZVLpgUtVEQxJsTSXCsSEcpGRfeViyBiIqjOp9obGilHKTmU/fgZ7BuS2MTAvyyIgtGN4df2GybJRldWdrqLkO9h4ZtjNBO0DU04k0injE5kaCJ6WTCXmh9hSyuhxxBKya85npXIiM7cl9EpvCuq5ZRtaShVCyVxiPjoaLg5VETBTrLjKSM1MtvpcS4h1NyLTVYjO/KR3GVouga+7063lURAREhlMylioSTSKNnfb5QzmieaHCyQ2ela3L9/IRmNVcsxJ8cYKBpGlXp/T1VvzacsGlttmWo4SJdQhGktCNMrpWa/ENJWP8htkjxQkMylFRTCIgJtKV080TswhJgwht9CTb4RJkklnyllYzI75HYT+l6Vr6KqHC+NnNKFK26ZZiIONMpgw94nAJQ25ZKr+MZH4paVrZmMVjNKG55jlL6dp+cw7hVKy3C1JBwzhKcZah1pd0lkR+IZoyLS8xfmBqqiM1+pqbNz2n4CcswsVCNRrCX22YpBJdSlRXLSIjMiO1vOY5+p7EnEGcVnEKhqmlRRsNOzg3aMiYdmGcOFuaTW2+4aVOOFY1aJGZ3ztYySfRyG0tspaaIm0pTopIi+yRFkOca2oTE+q2109PKRkkxmKY9Jw9bFEsMOtw6VaSSNptKXDsRmVuS/mOxKBrE1emSjVTjNIJBU82p06fqiaR8qQh2JTLoBL6SbUjTNy+mVkpIyIzVbMytfMe2bYtUvCSGSzWAYm88XO0KcgIGVwZvRTqE/bVoXKxJ5Duf9riZojqzleOmIiKSpuGqR9yCgmXm3Y1EMtB8BZLt15KTe903IzuVj5Rjp3gZOYCnqMcVT8LWLksYfZmcpKYnBEs3VqcJTbt02JKlGWfLYsuWxnXX65K6/i3SLNDNVYao9TTsT2kiATDH26cXexw/BX/4hGR5Xt+eZDWqsxbgI+hI2YymNn1LzGAmUPCxkPEyhpyMY4RXikpl1ZJJKy/6tK5fdcYJnC2pJdh7I4yS05KJdPJVPSnPcRmOdU24ki0eCN11xZcLokm6iMkctvzyGIUqxVr7D6OhpnSkuljxzOFcgZYzGodfS0hV3FuvGsm1fkSSI+W4E1V5NqrjF+nqTm0VLH5TUU1XAMtuzF+WwBOswRLK6eFWaiJNyz8//AJyHidruLPGyCl7U2LvWepVU2UjgU2M9MzJzS0dMvE81/wDa40PF3DvEWqajqWGeki57LYltDskfdnxsQ0uUhuxkUMR+M6rNN1eLc7mdjO2zSCiaraxAkM2dlLLMLDUSmVvLiXG3G0RX/u1oQu6k/eacjLzgaq5lsVF4x01VFQQcmZllQS1UxQ45LYmYwPAsR5IzM2VaR6WWeZF/5yFHHO2GdA17Jq9lD0FSxUXK4Z1a5wcJP1REBM+VJGiGUpS0KMjy0jsRF5jKx9Eg3hzVMeoAACgIL6a/uL6BehBfTX9xfQCeJ2+16AABQAAAQT01/cX0C9iCemv7i+gXsE8Pv9gAAKPy82280tp1tLja0mlaFFclEeRkZech8JXL4CVwLUBLIGGgYRojJtiHaS22gjO+SUkRFmZj0gAAAAAAAAAAAAAAAAAAAAAAAAAgvZff0H/nU/SL0IL2X39B/wCdT9IJ4v8AEr0AACiCdiB/Xn+dV9QvYgnYgf15/nVfUL2CeF/EAAAKAAAAPBDSWTQ03iJxDSmAZmUSkkvxjcMhLzqStYlLItJRZFyn5iHvAAAAAeSGlcshplEzOHl0GzHRZJKJiW2EpdeJJWSS1kV1WLkueQ9YAAAAAAAAAAAAAAAAgvpr+4voF6EF9Nf3F9AJ4nb7XoAAFAAABBPTX9xfQL2IJiXQ2KPhsXXlCNyv/kUQyVRbqf8AtsrxTH940PRbqAjTVNMz6T8r0AgvGh6LdQOND0W6gNXOJXoBBeND0W6gcaHot1ALnEr0AgvGh6LdQOND0W6gFziV6AQXjQ9FuoHGh6LdQC5xK9AILxoei3UDjQ9FuoBc4legEF40PRbqBxoei3UAucSvQCC8aHot1A40PRbqAXOJXoBBeND0W6gcaHot1ALnEr0AgvGh6LdQOND0W6gFziV6EF7L7+g/86n6Q40PRbqDAVVQ+PNazCR99TchXCy2OREp7XdShRWMtLk5ciBiuqaqcoiXTIAALoJ2IH9ef51X1C9jmalaGx5oqYzzvVbkKIWZRy4lXbDqVqO5no8vJkYz/Gh6LdQEKKpppymJXoBBeND0W6gcaHot1AbucSvQCC8aHot1A40PRbqAXOJXoBBeND0W6gcaHot1ALnEr0AgvGh6LdQOND0W6gFziV6AQXjQ9FuoHGh6LdQC5xK9AILxoei3UDjQ9FuoBc4legEF40PRbqBxoei3UAucSvQCC8aHot1A40PRbqAXOJXoBBeND0W6gcaHot1ALnEr0IL6a/uL6A40PRbqBhpQ2KPhrRXddtyv/kVwylQjqf8AtsnxSBmqqasvSflegAAWAAAAAAAAAAAAAAAAAAAAAHOuJkdiFPeyGXRFK1lESJg5aiJSXK2Rkm6siK9zHv8ABljl+MXylbgTuTn6QvYCCeDLHL8YvlK3B4Mscvxi+UrcBrnxXsBBPBljl+MXylbg8GWOX4xfKVuA1z4r2Agngyxy/GL5StweDLHL8YvlK3Aa58V7AQTwZY5fjF8pW4PBljl+MXylbgNc+K9gIJ4Mscvxi+UrcHgyxy/GL5StwGufFewEE8GWOX4xfKVuDwZY5fjF8pW4DXPivYCCeDLHL8YvlK3B4Mscvxi+UrcBrnxXsBBPBljl+MXylbg8GWOX4xfKVuA1z4r2Agngyxy/GL5StweDLHL8YvlK3Aa58V7AQTwZY5fjF8pW4PBljl+MXylbgNc+K9gIJ4Mscvxi+UrcHgyxy/GL5StwGufFewEE8GWOX4xfKVuHgw0jsQpF2QyKIqqsoiesFLVxKi5GzM03TkZXuQOXJz9YdFAAAqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCemv7i+gXsQT01/cX0C9gnh9/sAABQABPsc6xn9GyKUP04xLHo6YzZmXpKYIWppPCEqxnoKIyzIs88r5A5M5RnKggJHAVpiTIcRaepmu4Kk4iHn3DNw7kkVEcIyttJK0lk7yp82Ree98rH84eucS6zjZtFYbyimUSOWxC4RMROlvcJGuo+0bZNmRJTyEWl95HflIjNyFgASReNTBYbpnxSJ06gVM+4xSbhiMyjr20DXa2jbO9vyH4drfEqjZlKXcSJTTC5JM4lEGcXJXXiVBOr+ybpO30knmXi8ljO/IRi5SrwCORmNCZJNa3YnsPDLKTRzUFKIWFQooiOcWkzJB3M7ncizIiIi8xnYhQMO4ir4ummoytYaWwczfPhO1IJCyKHQfIhZqUrSX95lYvN5rg7FcTOUNjASPHfE2o6OmkJLKSlkvmMUiAemcxTFJWrgoZBkWkWipNjM9Llvycgp0gmcNOpHAzeDUSoeNh0PtmX/apJGX/AOQIqiZmHuAR7GascVKLjER8sYox6SRkezBQZRCIlUUS3C5XNFRJtpErk81sh4sQMQcUKQlculj0upSY1VF9tRa2oJEQuGRBMNaZqspSVaZncuW2VgZnEiM1uASuvcTZhL8FJXXlNsQDsTMDhSS3FpWppJunZRHoqI7kdy5fMPE5WmKNL1ZTUBXEDR8VL59GdpN9xVRPDtLMissydyNJXzsX+5ZXOziQsIDRcN6wmdSVZWkpjmINtiRTJMJCqZQolLQZGd1majIzy8xF/YYOvaxxAbxZhaGopimNJ2U90FOzdD9is4aTIjaV/bLR+/MHdcZZqsA1qg+/3teK7++9rhtNPa3cXh9HRselp8Lne9rWGyg7E5gAAOggvpr+4voF6EF9Nf3F9AJ4nb7XoAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQT01/cX0C9iCemv7i+gXsE8Pv8AYAACgI/2Vcoi5xRkkZh5FM52y1PGHYuFgIdbrqmCSvTsSMyyO17lmZZkLAAM1U6oycy0lT0CjE2mYvDXDOs6QJh9ZziKnLLrTDsIZESm/wDUWvSUfmIjI72Ox2unYqLmtSYQszekphQVS1BCduvRcqjpLCdsNutuHfQdsd2zIyzvc8zysRGd4AGIw8viXOy8NK27wE1D2gz31Jqo6m7lcOkyte3AEv7OlbP/AO3KMpV02qTFtuTUvL6DqWn4NEexGTaOnUL2shpts76DV7m4oz/IjyK5WMzK6gDtuPjNzsxhBB1liDidF1DKY6HdfdS3J4t5taGyNSL8K3kRLspKSvcytcvOKZgbN6kmFFIl9XSqPgJ1KlnBvriWFITFEjJLqFGREsjIszTfMr+chvoA7ThxTOcIAzRNc1viPWVUMT6IpFhazk8O3GyJMQcVCJSVzSTxlZCjzuV73PPIbj2OTE+lFFxVJ1BARrD0hjnYSHiHmFNoi2NIzQ42ZlY05mWRnYiIU4AcjDiJzS7skZXM5tS0iZlcujI91qoIR1xEMwpxSEJNV1GSSOyS858g1mYUlXFaY0VDUMunUTSUPK4dErgH4qSlEpi21EZumgnbJ0dK/jFe5GLuAOzhxM5uVJ1TVXQGC1QYdRVPzmanJ58yuCehpc5oxsKtZrM2iSRlkekZkkz0dIi8w+8sp2W9+VMP4YYWVxSk0YmSFxkfNmHmoftWxk6lRuOLI7l5sj+6/IOpABizCBUtUczoTEWv1x1AVxNGJpN+HhX5ZJ1PNKQkjK+kZpI73ytcYPFGFgqoxSk1T1HhhXE4p96Q6BwcPLXiiGX+GXok4SFp0TIrnbS5FFkOmQB2cPOMs04wJbpqElMxgaXoSp6RhUvpdcanUO42by1JtpINbizMiJJEeZWy+8UcABSmMoyAAAdBBfTX9xfQL0IL6a/uL6ATxO32vQAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5xqafyamuzDVNJ9MWZfBJkpIN507JJRoyIVHwy4X+2sr+NW4ZOpsOaIqWaKmk+puBmEapBIN51Jmo0lyFyjGeBrC72KlfwK3glFNcTOWR4ZcL/AG1lfxq3B4ZcL/bWV/GrcHgawu9ipX8Ct4eBrC72KlfwK3g77nB4ZcL/AG1lfxq3B4ZcL/bWV/GrcHgawu9ipX8Ct4eBrC72KlfwK3ge5weGXC/21lfxq3B4ZcL/AG1lfxq3B4GsLvYqV/AreHgawu9ipX8Ct4HucHhlwv8AbWV/GrcHhlwv9tZX8atweBrC72KlfwK3h4GsLvYqV/AreB7nB4ZcL/bWV/GrcHhlwv8AbWV/GrcHgawu9ipX8Ct4eBrC72KlfwK3ge5weGXC/wBtZX8atweGXC/21lfxq3B4GsLvYqV/AreHgawu9ipX8Ct4HucHhlwv9tZX8atweGXC/wBtZX8atweBrC72KlfwK3h4GsLvYqV/AreB7nB4ZcL/AG1lfxq3B4ZcL/bWV/GrcHgawu9ipX8Ct4eBrC72KlfwK3ge5weGXC/21lfxq3B4ZcL/AG1lfxq3B4GsLvYqV/AreHgawu9ipX8Ct4HucHhlwv8AbWV/GrcHhlwv9tZX8atweBrC72KlfwK3h4GsLvYqV/AreB7nB4ZcL/bWV/GrcHhlwv8AbWV/GrcHgawu9ipX8Ct4eBrC72KlfwK3ge5weGXC/wBtZX8atwl1NT+TVL2YaZpIZizMIJUlUgnmjuk1EjMhUfA1hd7FSv4Fbxk6Zw5oimpomaSGm4GXxqUGgnmkmSiSfKXKDk01zMZ5NqAABUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//2Q==';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Returns a valid, authentic 400x300 JPEG wireframe sketch (quality 0.85).
 * Contains visible drawn sections:
 * - HEADER: Brew Bay Cafe
 * - HERO: Best Artisan Coffee in Town
 * - Espresso Menu card
 * - Pastry Specials card
 * - BOOK A TABLE button
 */
function getTestWireframeJpeg(): string {
  return `data:image/jpeg;base64,${SAMPLE_WIREFRAME_JPEG_BASE64}`;
}

/**
 * Securely retrieves OPENROUTER_API_KEY from environment or config files.
 * Checks process.env, .env.local, .env, and supabase/.env.
 * Never logs or returns keys to stdout/stderr.
 */
function getSecureApiKey(): string | null {
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return process.env.OPENROUTER_API_KEY.trim();
  }

  const envFiles = ['.env.local', '.env', 'supabase/.env', '.env.demo'];
  for (const relPath of envFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key === 'OPENROUTER_API_KEY' && val) {
            return val;
          }
        }
      }
    } catch {}
  }

  return null;
}

async function runLiveJpegVerification() {
  console.log('================================================================');
  console.log('  PaperSite: Live OpenRouter JPEG Multimodal Verification       ');
  console.log(`  Target Model: ${OPENROUTER_FREE_MODEL}`);
  console.log(`  Endpoint:     ${OPENROUTER_ENDPOINT}`);
  console.log('================================================================\n');

  // 1. Wireframe JPEG Generation
  console.log('[1/4] Generating valid JPEG wireframe sketch image...');
  const rawJpegDataUrl = getTestWireframeJpeg();
  console.log('      Generated JPEG data URI length:', rawJpegDataUrl.length, 'characters');

  // 2. MIME Resolution via PaperSite resolveImageDataUri
  console.log('\n[2/4] Resolving image MIME type via resolveImageDataUri...');
  const resolvedDataUri = resolveImageDataUri(rawJpegDataUrl);

  if (!resolvedDataUri.startsWith('data:image/jpeg;base64,')) {
    console.error('[FAIL] Expected resolved data URI to start with "data:image/jpeg;base64,"');
    console.error('       Actual prefix:', resolvedDataUri.slice(0, 30));
    process.exit(1);
  }
  console.log('[PASS] MIME type verified: image/jpeg (correct data:image/jpeg;base64, header preserved)');

  // Also verify raw JPEG detection (without data: prefix)
  const rawBase64 = resolvedDataUri.split(',')[1];
  const fromRawResolved = resolveImageDataUri(rawBase64);
  if (!fromRawResolved.startsWith('data:image/jpeg;base64,')) {
    console.error('[FAIL] Raw JPEG base64 was mislabeled:', fromRawResolved.slice(0, 30));
    process.exit(1);
  }
  console.log('[PASS] Raw JPEG base64 compatibility: correctly identified as image/jpeg via magic bytes');

  // 3. Environment & API Key Verification
  console.log('\n[3/4] Checking environment configuration for OPENROUTER_API_KEY...');
  const apiKey = getSecureApiKey();
  if (!apiKey) {
    console.error('[FAIL] OPENROUTER_API_KEY not found in process.env, .env.local, or .env');
    console.error('       To run this live multimodal test, provide OPENROUTER_API_KEY in your environment:');
    console.error('       $env:OPENROUTER_API_KEY="sk-or-v1-..."  (PowerShell) or add OPENROUTER_API_KEY to .env.local\n');
    console.log('----------------------------------------------------------------');
    console.log('Safe Diagnostics:');
    console.log(`  HTTP Status:       N/A (Key not provided)`);
    console.log(`  Model:             ${OPENROUTER_FREE_MODEL}`);
    console.log(`  Image MIME Type:   image/jpeg`);
    console.log(`  Response Status:   FAILED (MISSING_API_KEY)`);
    console.log('----------------------------------------------------------------');
    process.exit(1);
  }
  console.log('[PASS] OPENROUTER_API_KEY loaded securely (key length:', apiKey.length, 'chars, value unprinted).');

  // 4. Send actual multimodal request to OpenRouter
  console.log(`\n[4/4] Sending multimodal request to OpenRouter (${OPENROUTER_FREE_MODEL})...`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://papersite.dev',
        'X-Title': 'PaperSite',
      },
      body: JSON.stringify({
        model: OPENROUTER_FREE_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe what you see in this website wireframe sketch. Identify the main visible sections, headers, and interactive elements.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: resolvedDataUri,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      console.error(`[FAIL] Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      process.exit(1);
    }
    console.error(`[FAIL] Network connection error after ${durationMs}ms:`, err.message);
    process.exit(1);
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startTime;
  const status = response.status;

  console.log('----------------------------------------------------------------');
  console.log('Safe Diagnostics:');
  console.log(`  HTTP Status:       ${status}`);
  console.log(`  Model:             ${OPENROUTER_FREE_MODEL}`);
  console.log(`  Image MIME Type:   image/jpeg`);
  console.log(`  Request Duration:  ${durationMs}ms`);

  let responseBodyText = '';
  try {
    responseBodyText = await response.text();
  } catch {
    responseBodyText = '(failed to read response text)';
  }

  if (!response.ok) {
    console.log(`  Response Status:   FAILED (HTTP ${status})`);
    if (status === 429) {
      console.error('[ERROR] OpenRouter rate limit reached on free model.');
    } else if (status === 502 || status === 503 || status === 504) {
      console.error('[ERROR] Upstream model provider temporarily unavailable.');
    } else if (status === 401 || status === 403) {
      console.error('[ERROR] Authentication failed. Please verify OPENROUTER_API_KEY.');
    } else {
      console.error(`[ERROR] Upstream error: ${responseBodyText.slice(0, 200)}`);
    }
    console.log('----------------------------------------------------------------');
    process.exit(1);
  }

  let responseJson: any;
  try {
    responseJson = JSON.parse(responseBodyText);
  } catch {
    console.error('[FAIL] Malformed JSON returned by OpenRouter API');
    console.log('----------------------------------------------------------------');
    process.exit(1);
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.error('[FAIL] Response choices[0].message.content is missing or empty');
    console.log('----------------------------------------------------------------');
    process.exit(1);
  }

  console.log(`  Response Status:   SUCCESS (HTTP 200)`);
  console.log(`  Response Length:   ${content.length} characters`);
  console.log(`  Response Excerpt:  "${content.trim().slice(0, 180).replace(/\s+/g, ' ')}..."`);
  console.log('----------------------------------------------------------------\n');

  console.log('================================================================');
  console.log('  Live Multimodal JPEG Verification: PASSED                     ');
  console.log('  - Valid JPEG image created and preserved as image/jpeg        ');
  console.log('  - OpenRouter accepted data:image/jpeg;base64 payload          ');
  console.log(`  - Free model (${OPENROUTER_FREE_MODEL}) returned description`);
  console.log('  - Zero paid models, zero fallbacks, zero provider switching   ');
  console.log('================================================================');
}

runLiveJpegVerification().catch((err) => {
  console.error('[UNHANDLED_ERROR]', err.message);
  process.exit(1);
});
