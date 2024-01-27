mod utils;

use std::sync::Mutex;
use codec2::{Codec2, Codec2Mode};
use lazy_static::lazy_static;

use wasm_bindgen::prelude::*;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

lazy_static!(
    static ref C2: Mutex<Codec2> = Mutex::new(Codec2::new(Codec2Mode::MODE_3200));
);

#[wasm_bindgen]
pub fn decode(mut data: Vec<u8>) -> Vec<i16> {
    console_error_panic_hook::set_once();

    let mut packed = vec![0; (C2.lock().expect("Lock failed").bits_per_frame() + 7) / 8]; //u8 I/O buffer for encoded bits
    let mut samps = vec![0; C2.lock().expect("Lock failed").samples_per_frame()]; //i16 I/O buffer

    let mut out: Vec<i16> = vec![0;0];

    while data.len() > 15 {
        packed = data.drain(0..packed.len()).as_slice().to_vec();
        C2.lock().expect("Lock failed").decode(&mut samps, &packed);
        out.append(&mut samps);
        samps = vec![0; C2.lock().expect("Lock failed").samples_per_frame()];
    }
    out
}

// TODO -> Encode