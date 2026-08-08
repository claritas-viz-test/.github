use std::process::ExitCode;

const HELP: &str = "claritas-portable-rust-cli 0.1.0\n\nUsage: claritas-portable-rust-cli [--help]\n";

fn run<I>(argv: I) -> Result<&'static str, &'static str>
where
    I: IntoIterator,
    I::Item: AsRef<str>,
{
    match argv.into_iter().next() {
        None => Ok(HELP),
        Some(argument) if matches!(argument.as_ref(), "--help" | "-h") => Ok(HELP),
        Some(_) => Err("unsupported argument; use --help"),
    }
}

fn main() -> ExitCode {
    match run(std::env::args().skip(1)) {
        Ok(output) => {
            print!("{output}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{error}");
            ExitCode::from(2)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{run, HELP};

    #[test]
    fn help_and_rejection_are_stable() {
        assert_eq!(run(["--help"]), Ok(HELP));
        assert!(run(["--deploy"]).is_err());
    }
}
