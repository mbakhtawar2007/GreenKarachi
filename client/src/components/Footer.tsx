const Footer: React.FC = () => {
  return (
    <footer className="bg-green-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-2xl font-bold text-green-200">
            GreenKarachi
          </div>
          
          <div className="text-sm">
            <a href="#" className="text-white hover:text-green-300 transition-colors">
              About
            </a>
            <a href="#" className="text-white hover:text-green-300 transition-colors ml-4">
              Contact
            </a>
            <a href="#" className="text-white hover:text-green-300 transition-colors ml-4">
              Terms
            </a>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm opacity-8">
          &copy; {new Date().getFullYear()} GreenKarachi. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;